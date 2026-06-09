from app.models.schemas import DiagnosticsResponse
from app.utils.config import Settings


def _provider_status(value: str | None) -> str:
    return "configured" if value else "not_configured"


def build_diagnostics(settings: Settings) -> DiagnosticsResponse:
    if settings.session_persistence_ready:
        database = "session_persistence_ready"
    elif settings.supabase_configured:
        database = "service_role_missing"
    else:
        database = "not_configured"

    return DiagnosticsResponse(
        api="online",
        websocket="available",
        auth="jwt_foundation",
        ai_providers={
            "openai": _provider_status(settings.openai_api_key),
            "gemini": _provider_status(settings.gemini_api_key),
            "deepgram": _provider_status(settings.deepgram_api_key),
            "llm_orchestration": settings.llm_provider,
        },
        database=database,
        resume_rag={
            "enabled": "true" if settings.resume_rag_enabled else "false",
            "embedding_model": settings.resume_embedding_model,
            "embedding_dimension": str(settings.resume_embedding_dimension),
            "vector_store": "expected",
            "supabase": "configured"
            if settings.supabase_service_role_configured
            else "service_role_missing",
        },
        environment=settings.api_env,
    )
