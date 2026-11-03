"""Provision a production administrator: python -m backend.app.create_admin."""
import asyncio
import getpass
from uuid import uuid4

from sqlalchemy import select
from backend.app.core.security import get_password_hash
from backend.app.db.session import async_session_factory
from backend.app.db.init_db import init_db
from backend.app.models.user import User


async def main():
    username = input("Administrator username: ").strip()
    password = getpass.getpass("New password (at least 14 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if not username or len(password) < 14 or password != confirmation:
        raise SystemExit("Username is required. Passwords must match and contain at least 14 characters.")
    await init_db()
    async with async_session_factory() as db:
        existing = await db.scalar(select(User).where(User.username == username))
        if existing:
            raise SystemExit("This username already exists. Choose a new administrator username.")
        db.add(User(id="USR-" + uuid4().hex, username=username, full_name="Administrator",
                    hashed_password=get_password_hash(password), role="admin", is_active=True))
        await db.commit()
    print("Administrator created.")


if __name__ == "__main__":
    asyncio.run(main())
