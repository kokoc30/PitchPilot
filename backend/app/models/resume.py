from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ResumeDocumentSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    filename: str
    file_type: str = Field(alias="fileType")
    file_size_bytes: int | None = Field(default=None, alias="fileSizeBytes")
    text_char_count: int = Field(default=0, alias="textCharCount")
    chunk_count: int = Field(default=0, alias="chunkCount")
    embedding_model: str = Field(alias="embeddingModel")
    status: str
    created_at: str = Field(alias="createdAt")


class ResumeChunkPreview(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    chunk_index: int = Field(alias="chunkIndex")
    content: str
    content_char_count: int = Field(alias="contentCharCount")
    metadata: dict[str, Any] = Field(default_factory=dict)


class ResumeDocumentDetail(ResumeDocumentSummary):
    preview_text: str | None = Field(default=None, alias="previewText")
    chunks_preview: list[ResumeChunkPreview] = Field(
        default_factory=list,
        alias="chunksPreview",
    )


class ResumeUploadResponse(BaseModel):
    document: ResumeDocumentSummary
    message: str
    warnings: list[str] = Field(default_factory=list)


class ResumeListResponse(BaseModel):
    resumes: list[ResumeDocumentSummary]


class ResumeDeleteResponse(BaseModel):
    deleted: bool
    id: str


class ResumeStatusResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    enabled: bool
    embedding_model: str = Field(alias="embeddingModel")
    embedding_dimension: int = Field(alias="embeddingDimension")
    allowed_file_types: list[str] = Field(alias="allowedFileTypes")
    max_file_size_mb: int = Field(alias="maxFileSizeMb")
    supabase_configured: bool = Field(alias="supabaseConfigured")
    vector_store_expected: bool = Field(alias="vectorStoreExpected")
