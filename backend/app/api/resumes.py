from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.models.resume import (
    ResumeDeleteResponse,
    ResumeDocumentDetail,
    ResumeListResponse,
    ResumeStatusResponse,
    ResumeUploadResponse,
)
from app.models.resume_questions import (
    ResumeQuestion,
    ResumeQuestionGenerateRequest,
    ResumeQuestionGenerateResponse,
    ResumeRetrievalPreviewItem,
    ResumeRetrievalPreviewResponse,
)
from app.models.resume_question_history import (
    ResumeQuestionHistoryDeleteResponse,
    ResumeQuestionHistoryListResponse,
    ResumeQuestionHistoryUpdateRequest,
)
from app.services.resume_chunker import chunk_resume_text
from app.services.resume_embeddings import ResumeEmbeddingError, embed_texts
from app.services.resume_parser import (
    ResumeParseError,
    detect_resume_file_type,
    parse_resume_file,
)
from app.services.resume_question_generator import (
    ResumeQuestionGenerationError,
    generate_resume_questions,
)
from app.services.resume_question_store import (
    ResumeQuestionNotFoundError,
    ResumeQuestionStoreError,
    delete_resume_question,
    list_resume_questions,
    patch_resume_question,
    save_generated_resume_questions,
)
from app.services.resume_rag_store import (
    ResumeNotFoundError,
    ResumeStoreError,
    ResumeStoreUnavailable,
    create_resume_document,
    delete_user_resume,
    get_user_resume,
    insert_resume_chunks,
    list_user_resumes,
)
from app.services.resume_retriever import retrieve_resume_chunks
from app.utils.auth import require_current_user_claims, user_id_from_claims
from app.utils.config import get_settings

router = APIRouter(prefix="/resumes", tags=["resumes"])

ALLOWED_FILE_TYPES = ["pdf", "docx", "txt"]


@router.get("/status", response_model=ResumeStatusResponse)
async def resume_status() -> ResumeStatusResponse:
    settings = get_settings()
    return ResumeStatusResponse(
        enabled=settings.resume_rag_enabled,
        embeddingModel=settings.resume_embedding_model,
        embeddingDimension=settings.resume_embedding_dimension,
        allowedFileTypes=ALLOWED_FILE_TYPES,
        maxFileSizeMb=settings.resume_max_file_mb,
        supabaseConfigured=settings.supabase_service_role_configured,
        vectorStoreExpected=True,
    )


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeUploadResponse:
    settings = get_settings()
    if not settings.resume_rag_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_rag_disabled", "message": "Resume RAG is disabled."},
        )

    user_id = user_id_from_claims(claims)
    content = await file.read()
    filename = file.filename or "resume"

    try:
        file_type = detect_resume_file_type(filename, file.content_type)
        extracted_text = await run_in_threadpool(
            parse_resume_file,
            filename,
            file.content_type,
            content,
        )
        chunks = chunk_resume_text(
            extracted_text,
            chunk_size_chars=settings.resume_chunk_size_chars,
            overlap_chars=settings.resume_chunk_overlap_chars,
        )
        if not chunks:
            raise ResumeParseError(
                "No useful resume chunks could be created from this file.",
                code="empty_resume_chunks",
            )
        if not settings.supabase_service_role_configured:
            raise ResumeStoreUnavailable(
                "Resume RAG storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            )

        embeddings = await run_in_threadpool(
            embed_texts,
            [chunk.content for chunk in chunks],
        )
        document = await run_in_threadpool(
            create_resume_document,
            user_id=user_id,
            filename=filename,
            file_type=file_type,
            file_size_bytes=len(content),
            text_char_count=len(extracted_text),
            chunk_count=len(chunks),
            embedding_model=settings.resume_embedding_model,
        )
        try:
            await run_in_threadpool(
                insert_resume_chunks,
                user_id=user_id,
                resume_id=document.id,
                chunks=chunks,
                embeddings=embeddings,
            )
        except Exception:
            await run_in_threadpool(delete_user_resume, user_id, document.id)
            raise
    except ResumeParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except ResumeEmbeddingError as exc:
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if exc.code in {"embedding_dependency_missing", "embedding_model_load_failed"}
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(
            status_code=response_status,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    warnings: list[str] = []
    if file_type == "pdf":
        warnings.append("PDF extraction quality depends on selectable text in the file.")

    return ResumeUploadResponse(
        document=document,
        message=f"Processed {len(chunks)} resume chunks for Interview Mode.",
        warnings=warnings,
    )


@router.get("", response_model=ResumeListResponse)
async def list_resumes(
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeListResponse:
    user_id = user_id_from_claims(claims)
    try:
        resumes = await run_in_threadpool(list_user_resumes, user_id)
        return ResumeListResponse(resumes=resumes)
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.get("/{resume_id}", response_model=ResumeDocumentDetail)
async def get_resume(
    resume_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeDocumentDetail:
    user_id = user_id_from_claims(claims)
    try:
        return await run_in_threadpool(get_user_resume, user_id, resume_id)
    except ResumeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume document was not found.",
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.delete("/{resume_id}", response_model=ResumeDeleteResponse)
async def delete_resume(
    resume_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeDeleteResponse:
    user_id = user_id_from_claims(claims)
    try:
        await run_in_threadpool(delete_user_resume, user_id, resume_id)
        return ResumeDeleteResponse(deleted=True, id=resume_id)
    except ResumeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume document was not found.",
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.post(
    "/{resume_id}/questions/generate",
    response_model=ResumeQuestionGenerateResponse,
)
async def generate_questions(
    resume_id: str,
    request: ResumeQuestionGenerateRequest,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeQuestionGenerateResponse:
    settings = get_settings()
    if not settings.resume_rag_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_rag_disabled", "message": "Resume RAG is disabled."},
        )

    user_id = user_id_from_claims(claims)

    try:
        document = await run_in_threadpool(get_user_resume, user_id, resume_id)
    except ResumeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "resume_not_found", "message": "Resume document was not found."},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if document.chunk_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "resume_has_no_chunks",
                "message": "This resume has no searchable chunks. Re-upload a PDF, DOCX, or TXT file with selectable text.",
            },
        )

    query_text = _build_query_text(request)
    try:
        query_embeddings = await run_in_threadpool(embed_texts, [query_text])
    except ResumeEmbeddingError as exc:
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if exc.code in {"embedding_dependency_missing", "embedding_model_load_failed"}
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(
            status_code=response_status,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    query_embedding = query_embeddings[0] if query_embeddings else []
    top_k = max(request.count + 2, 6)

    try:
        retrieved_chunks, retrieval_method = await run_in_threadpool(
            retrieve_resume_chunks,
            user_id=user_id,
            resume_id=document.id,
            query_embedding=query_embedding,
            top_k=top_k,
        )
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    try:
        response = await generate_resume_questions(
            resume_id=document.id,
            request=request,
            retrieved_chunks=retrieved_chunks,
            retrieval_method=retrieval_method,
            settings=settings,
        )
    except ResumeQuestionGenerationError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if request.save:
        try:
            response.questions = await run_in_threadpool(
                save_generated_resume_questions,
                user_id=user_id,
                resume_id=document.id,
                questions=response.questions,
                target_role=request.target_role,
                focus=request.focus,
                resume_label=document.filename,
            )
        except (ResumeStoreUnavailable, ResumeQuestionStoreError) as exc:
            response.warnings.append(
                "Question history could not be saved; generated questions are still available for this session."
            )
            response.warnings.append(str(exc))

    return response


@router.get(
    "/{resume_id}/questions",
    response_model=ResumeQuestionHistoryListResponse,
)
async def get_question_history(
    resume_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeQuestionHistoryListResponse:
    user_id = user_id_from_claims(claims)
    try:
        document = await run_in_threadpool(get_user_resume, user_id, resume_id)
        questions = await run_in_threadpool(
            list_resume_questions,
            user_id=user_id,
            resume_id=document.id,
            resume_label=document.filename,
        )
        return ResumeQuestionHistoryListResponse(
            resumeId=document.id,
            questions=questions,
        )
    except ResumeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "resume_not_found", "message": "Resume document was not found."},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeQuestionStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.patch(
    "/{resume_id}/questions/{question_id}",
    response_model=ResumeQuestion,
)
async def update_question_history(
    resume_id: str,
    question_id: str,
    request: ResumeQuestionHistoryUpdateRequest,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeQuestion:
    user_id = user_id_from_claims(claims)
    try:
        document = await run_in_threadpool(get_user_resume, user_id, resume_id)
        return await run_in_threadpool(
            patch_resume_question,
            user_id=user_id,
            resume_id=document.id,
            question_id=question_id,
            is_favorite=request.is_favorite,
            mark_practiced=request.mark_practiced,
            resume_label=document.filename,
        )
    except (ResumeNotFoundError, ResumeQuestionNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "question_not_found", "message": "Resume question was not found."},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeQuestionStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.delete(
    "/{resume_id}/questions/{question_id}",
    response_model=ResumeQuestionHistoryDeleteResponse,
)
async def delete_question_history(
    resume_id: str,
    question_id: str,
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeQuestionHistoryDeleteResponse:
    user_id = user_id_from_claims(claims)
    try:
        document = await run_in_threadpool(get_user_resume, user_id, resume_id)
        await run_in_threadpool(
            delete_resume_question,
            user_id=user_id,
            resume_id=document.id,
            question_id=question_id,
        )
        return ResumeQuestionHistoryDeleteResponse(deleted=True, id=question_id)
    except (ResumeNotFoundError, ResumeQuestionNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "question_not_found", "message": "Resume question was not found."},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeQuestionStoreError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.get(
    "/{resume_id}/retrieval-preview",
    response_model=ResumeRetrievalPreviewResponse,
)
async def retrieval_preview(
    resume_id: str,
    q: str = Query(..., min_length=1, max_length=600, description="Retrieval query text"),
    limit: int = Query(5, ge=1, le=12),
    claims: dict[str, Any] = Depends(require_current_user_claims),
) -> ResumeRetrievalPreviewResponse:
    settings = get_settings()
    if not settings.resume_rag_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_rag_disabled", "message": "Resume RAG is disabled."},
        )

    user_id = user_id_from_claims(claims)

    try:
        document = await run_in_threadpool(get_user_resume, user_id, resume_id)
    except ResumeNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "resume_not_found", "message": "Resume document was not found."},
        ) from exc
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if document.chunk_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "resume_has_no_chunks",
                "message": "This resume has no searchable chunks. Re-upload a PDF, DOCX, or TXT file with selectable text.",
            },
        )

    try:
        query_embeddings = await run_in_threadpool(embed_texts, [q])
    except ResumeEmbeddingError as exc:
        response_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if exc.code in {"embedding_dependency_missing", "embedding_model_load_failed"}
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(
            status_code=response_status,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    query_embedding = query_embeddings[0] if query_embeddings else []

    try:
        retrieved_chunks, retrieval_method = await run_in_threadpool(
            retrieve_resume_chunks,
            user_id=user_id,
            resume_id=document.id,
            query_embedding=query_embedding,
            top_k=limit,
        )
    except ResumeStoreUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "resume_store_unavailable", "message": str(exc)},
        ) from exc
    except ResumeStoreError as exc:
        raise HTTPException(
            status_code=_resume_store_status(exc),
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    previews = [
        ResumeRetrievalPreviewItem(
            id=chunk.id,
            chunkIndex=chunk.chunk_index,
            contentPreview=_truncate_preview(chunk.content, 220),
            similarity=chunk.similarity,
            distance=chunk.distance,
        )
        for chunk in retrieved_chunks[:limit]
    ]
    return ResumeRetrievalPreviewResponse(
        resumeId=document.id,
        query=q,
        method=retrieval_method,  # type: ignore[arg-type]
        chunks=previews,
    )


def _build_query_text(request: ResumeQuestionGenerateRequest) -> str:
    type_label = {
        "behavioral": "behavioral interview answers and Situation-Action-Result stories",
        "technical": "technical interview answers covering tools, design decisions, and debugging",
        "project": "project deep-dive interview answers about ownership, outcomes, and tradeoffs",
        "startup": "startup interview answers about ambiguity, shipping fast, and customer impact",
        "general": "general interview answers about background, experience, and motivation",
    }.get(request.interview_type, "interview answers")

    parts = [
        f"Generate {request.interview_type} interview questions grounded in resume experience.",
        f"Focus on {type_label}.",
    ]
    if request.target_role:
        parts.append(f"Target role: {request.target_role}.")
    if request.focus:
        parts.append(f"Specific focus: {request.focus}.")
    parts.append(
        "Retrieve resume content covering roles, responsibilities, projects, "
        "metrics, tools, and outcomes."
    )
    return " ".join(parts)


def _truncate_preview(content: str, max_chars: int) -> str:
    if not content:
        return ""
    cleaned = content.strip()
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[:max_chars].rstrip() + "..."


def _resume_store_status(exc: ResumeStoreError) -> int:
    if exc.code in {
        "resume_rag_migration_missing",
        "resume_store_schema_stale",
        "resume_retrieval_rpc_missing",
        "resume_question_history_missing",
        "vector_store_unavailable",
    }:
        return status.HTTP_503_SERVICE_UNAVAILABLE
    if exc.code == "resume_store_forbidden":
        return status.HTTP_503_SERVICE_UNAVAILABLE
    return status.HTTP_500_INTERNAL_SERVER_ERROR
