from typing import Optional
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        if settings.DEMO_MODE:
            # Fall back to default seeded SecOps lead analyst for seamless local analyst workflow
            result = await db.execute(select(User).where(User.username == "secops_analyst@sentinel.ai"))
            analyst = result.scalar_one_or_none()
            if analyst and analyst.is_active:
                return analyst

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Missing Bearer authorization header"}
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token is invalid, malformed, or expired"}
        )

    username: str = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token payload missing subject identifier"}
        )

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "Authenticated user does not exist"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USER_INACTIVE", "message": "Account has been deactivated"}
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "INSUFFICIENT_PRIVILEGES", "message": "Operation requires admin role"}
        )
    return current_user


async def verify_forwarder_auth(
    x_forwarder_key: Optional[str] = Header(None, alias="X-Sentinel-Forwarder-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> bool:
    """Allows ingestion from either a registered forwarder key or authenticated analyst."""
    if x_forwarder_key and x_forwarder_key == settings.FORWARDER_API_KEY:
        return True

    if credentials:
        try:
            await get_current_user(credentials=credentials, db=db)
            return True
        except HTTPException:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED_INGEST", "message": "Valid X-Sentinel-Forwarder-Key or Bearer token required"}
    )


async def require_production_session(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    # These endpoints have their own password or forwarder-key validation.
    if request.url.path in (
        settings.API_V1_STR + "/auth/login",
        settings.API_V1_STR + "/ingest/batch",
        settings.API_V1_STR + "/stream/broadcast",
    ):
        return
    if not settings.DEMO_MODE:
        await get_current_user(credentials=credentials, db=db)
