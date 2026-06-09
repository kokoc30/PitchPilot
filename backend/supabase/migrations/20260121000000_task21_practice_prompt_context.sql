-- Task 21 (Resume RAG-3): persist the selected practice prompt and the
-- resume/question metadata that produced it, so dashboard/session detail
-- can surface the practiced question without re-fetching resume chunks.
-- Depends on Task 14 (practice_sessions) and is independent from
-- resume_documents/resume_chunks. We do NOT add an FK to resume_documents
-- so deleting a resume does not cascade away saved practice history; the
-- column is best-effort context only.

alter table public.practice_sessions
  add column if not exists selected_prompt_text text,
  add column if not exists selected_prompt_source text,
  add column if not exists selected_prompt_metadata jsonb,
  add column if not exists resume_id uuid,
  add column if not exists question_id text;

create index if not exists idx_practice_sessions_resume
  on public.practice_sessions(user_id, resume_id)
  where resume_id is not null;
