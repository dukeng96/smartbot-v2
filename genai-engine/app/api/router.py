from fastapi import APIRouter

from app.api.flow import router as flow_router
from app.api.health import router as health_router
from app.api.knowledge_bases import router as kb_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(kb_router, prefix="/engine/v1", tags=["Knowledge Bases"])
api_router.include_router(documents_router, prefix="/engine/v1", tags=["Documents"])
api_router.include_router(chat_router, prefix="/engine/v1", tags=["Chat"])
api_router.include_router(flow_router, prefix="/engine", tags=["Flows"])
