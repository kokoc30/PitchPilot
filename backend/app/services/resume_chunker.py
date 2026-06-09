import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ResumeTextChunk:
    index: int
    content: str
    char_start: int
    char_end: int
    metadata: dict[str, Any] = field(default_factory=dict)


def clean_resume_text(text: str) -> str:
    normalized = text.replace("\x00", " ")
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[ \t\f\v]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    normalized = "\n".join(line.strip() for line in normalized.splitlines())
    return normalized.strip()


def chunk_resume_text(
    text: str,
    chunk_size_chars: int = 900,
    overlap_chars: int = 150,
) -> list[ResumeTextChunk]:
    cleaned = clean_resume_text(text)
    if not cleaned:
        return []

    chunk_size = max(300, chunk_size_chars)
    overlap = min(max(0, overlap_chars), chunk_size // 2)
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", cleaned) if paragraph.strip()]

    raw_chunks: list[tuple[str, int, int]] = []
    current_parts: list[str] = []
    current_start: int | None = None
    cursor = 0

    for paragraph in paragraphs:
        paragraph_start = cleaned.find(paragraph, cursor)
        if paragraph_start < 0:
            paragraph_start = cursor
        paragraph_end = paragraph_start + len(paragraph)
        cursor = paragraph_end

        if len(paragraph) > chunk_size:
            if current_parts:
                content = "\n\n".join(current_parts).strip()
                raw_chunks.append((content, current_start or 0, (current_start or 0) + len(content)))
                current_parts = []
                current_start = None
            raw_chunks.extend(_split_long_paragraph(paragraph, paragraph_start, chunk_size, overlap))
            continue

        candidate = "\n\n".join([*current_parts, paragraph]).strip()
        if current_parts and len(candidate) > chunk_size:
            content = "\n\n".join(current_parts).strip()
            raw_chunks.append((content, current_start or 0, (current_start or 0) + len(content)))
            overlap_text = _tail_overlap(content, overlap)
            current_parts = [overlap_text, paragraph] if overlap_text else [paragraph]
            current_start = max(paragraph_start - len(overlap_text), 0) if overlap_text else paragraph_start
        else:
            if current_start is None:
                current_start = paragraph_start
            current_parts.append(paragraph)

    if current_parts:
        content = "\n\n".join(current_parts).strip()
        raw_chunks.append((content, current_start or 0, min(len(cleaned), (current_start or 0) + len(content))))

    chunks: list[ResumeTextChunk] = []
    for index, (content, start, end) in enumerate(raw_chunks):
        compact = clean_resume_text(content)
        if len(compact) < 80 and len(raw_chunks) > 1:
            continue
        chunks.append(
            ResumeTextChunk(
                index=len(chunks),
                content=compact,
                char_start=start,
                char_end=end,
                metadata={
                    "chunk_index": len(chunks),
                    "char_start": start,
                    "char_end": end,
                },
            ),
        )

    return chunks


def _split_long_paragraph(
    paragraph: str,
    paragraph_start: int,
    chunk_size: int,
    overlap: int,
) -> list[tuple[str, int, int]]:
    chunks: list[tuple[str, int, int]] = []
    start = 0
    while start < len(paragraph):
        end = min(len(paragraph), start + chunk_size)
        if end < len(paragraph):
            sentence_break = max(
                paragraph.rfind(". ", start, end),
                paragraph.rfind("; ", start, end),
                paragraph.rfind(", ", start, end),
            )
            if sentence_break > start + chunk_size * 0.55:
                end = sentence_break + 1
        content = paragraph[start:end].strip()
        if content:
            chunks.append((content, paragraph_start + start, paragraph_start + end))
        if end >= len(paragraph):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _tail_overlap(content: str, overlap: int) -> str:
    if overlap <= 0 or len(content) <= overlap:
        return ""
    tail = content[-overlap:]
    first_space = tail.find(" ")
    if first_space > 0:
        tail = tail[first_space + 1 :]
    return tail.strip()
