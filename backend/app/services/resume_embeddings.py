from typing import Any

from app.utils.config import get_settings

_MODEL: Any | None = None
_MODEL_NAME: str | None = None


class ResumeEmbeddingError(Exception):
    def __init__(self, message: str, *, code: str = "resume_embedding_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    model = _get_model()
    settings = get_settings()
    try:
        encoded = model.encode(
            texts,
            batch_size=16,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
    except Exception as exc:
        raise ResumeEmbeddingError(
            "Resume embedding failed.",
            code="embedding_generation_failed",
        ) from exc

    embeddings = encoded.tolist()
    expected_dimension = settings.resume_embedding_dimension
    for embedding in embeddings:
        if len(embedding) != expected_dimension:
            raise ResumeEmbeddingError(
                f"Embedding dimension mismatch. Expected {expected_dimension}, got {len(embedding)}.",
                code="embedding_dimension_mismatch",
            )

    return [[float(value) for value in embedding] for embedding in embeddings]


def _get_model() -> Any:
    global _MODEL, _MODEL_NAME

    settings = get_settings()
    if _MODEL is not None and _MODEL_NAME == settings.resume_embedding_model:
        return _MODEL

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise ResumeEmbeddingError(
            "sentence-transformers is not installed.",
            code="embedding_dependency_missing",
        ) from exc

    try:
        _MODEL = SentenceTransformer(settings.resume_embedding_model)
    except Exception as exc:
        raise ResumeEmbeddingError(
            (
                f"Unable to load embedding model {settings.resume_embedding_model}. "
                "If this is the first run, the model may still be downloading; try again after it finishes."
            ),
            code="embedding_model_load_failed",
        ) from exc

    _MODEL_NAME = settings.resume_embedding_model
    return _MODEL
