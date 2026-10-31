from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.events import router as events_router
from backend.app.api.v1.detections import router as detections_router
from backend.app.api.v1.incidents import router as incidents_router
from backend.app.api.v1.analyst import router as analyst_router
from backend.app.api.v1.response import router as response_router
from backend.app.api.v1.sources import router as sources_router
from backend.app.api.v1.threat_intel import router as threat_intel_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(detections_router)
api_router.include_router(incidents_router)
api_router.include_router(analyst_router)
api_router.include_router(response_router)
api_router.include_router(sources_router)
api_router.include_router(threat_intel_router)
api_router.include_router(audit_router)
api_router.include_router(settings_router)
