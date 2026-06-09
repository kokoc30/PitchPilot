import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


class Settings(BaseModel):
    api_env: str = "development"
    frontend_url: str = "http://localhost:5473"
    backend_public_url: str | None = None
    extra_cors_origins: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None
    jwt_secret: str = "dev-placeholder-change-me"
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    deepgram_api_key: str | None = None
    llm_provider: str = "auto"
    openai_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-2.5-flash"
    llm_timeout_seconds: float = 20
    llm_fallback_to_mock: bool = True
    # Transcription provider: "auto" | "deepgram" | "mock"
    transcription_provider: str = "auto"
    resume_rag_enabled: bool = True
    resume_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    resume_embedding_dimension: int = 384
    resume_max_file_mb: int = 5
    resume_chunk_size_chars: int = 900
    resume_chunk_overlap_chars: int = 150

    @property
    def auth_jwt_secret(self) -> str:
        return self.supabase_jwt_secret or self.jwt_secret

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url)

    @property
    def supabase_service_role_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def session_persistence_ready(self) -> bool:
        return self.supabase_service_role_configured

    @property
    def resume_rag_ready(self) -> bool:
        return self.resume_rag_enabled and self.supabase_service_role_configured


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_env=os.getenv("API_ENV", "development"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5473"),
        backend_public_url=os.getenv("BACKEND_PUBLIC_URL") or None,
        extra_cors_origins=os.getenv("EXTRA_CORS_ORIGINS") or None,
        supabase_url=os.getenv("SUPABASE_URL") or None,
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY") or None,
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or None,
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET") or None,
        jwt_secret=os.getenv("JWT_SECRET", "dev-placeholder-change-me"),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        deepgram_api_key=os.getenv("DEEPGRAM_API_KEY") or None,
        llm_provider=os.getenv("LLM_PROVIDER", "auto").lower(),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        llm_timeout_seconds=_env_float("LLM_TIMEOUT_SECONDS", 20),
        llm_fallback_to_mock=_env_bool("LLM_FALLBACK_TO_MOCK", True),
        transcription_provider=os.getenv("TRANSCRIPTION_PROVIDER", "auto"),
        resume_rag_enabled=_env_bool("RESUME_RAG_ENABLED", True),
        resume_embedding_model=os.getenv(
            "RESUME_EMBEDDING_MODEL",
            "sentence-transformers/all-MiniLM-L6-v2",
        ),
        resume_embedding_dimension=_env_int("RESUME_EMBEDDING_DIMENSION", 384),
        resume_max_file_mb=_env_int("RESUME_MAX_FILE_MB", 5),
        resume_chunk_size_chars=_env_int("RESUME_CHUNK_SIZE_CHARS", 900),
        resume_chunk_overlap_chars=_env_int("RESUME_CHUNK_OVERLAP_CHARS", 150),
    )


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default
