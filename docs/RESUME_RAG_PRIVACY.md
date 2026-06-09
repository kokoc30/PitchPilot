# Resume RAG Privacy and Security Notes

## Scope

This document covers the Resume RAG Interview Coach through RAG-5. It is
for demo/deployment readiness review, not a new feature spec.

## Data Storage

| Data | Stored? | Location |
| --- | --- | --- |
| Uploaded resume file | No | The file is parsed in memory and discarded |
| Extracted resume text | Yes | `resume_chunks.content` only |
| Resume embeddings | Yes | `resume_chunks.embedding` |
| Generated questions | Yes | `resume_generated_questions.question` |
| Grounding references | Yes, bounded | `resume_generated_questions.grounded_in` and `practice_sessions.selected_prompt_metadata` |
| Saved prompt snapshot | Yes, bounded | `practice_sessions.selected_prompt_text/source/metadata` |
| Service role key | Backend only | Backend environment variable |

## Privacy Controls

- Resume text is stored only in `resume_chunks.content`.
- Generated question history stores question text, bounded short
  references, chunk ids, and metadata. It does not store full chunks.
- Saved sessions store the practiced question snapshot and bounded
  metadata. They intentionally survive resume deletion.
- Coaching report prompts use the selected question plus short grounded
  references only.
- Resume detail and retrieval-preview APIs return snippets, not full
  chunks.
- Backend Supabase errors are mapped to user-safe messages before being
  returned to the frontend.

## Ownership Controls

- Backend routes require bearer auth for upload/list/detail/delete,
  question generation/history, coaching report, and session persistence.
- Backend routes derive `user_id` from the verified JWT `sub`; clients
  do not provide ownership.
- Resume, question, and session queries include `user_id` filters.
- RLS policies on Supabase tables restrict users to their own rows.
- `resume_generated_questions.resume_id` cascades on resume delete.
- `practice_sessions.resume_id` has no FK so saved prompt snapshots stay
  available after resume deletion.
- RAG-5 migration `2026_task23_resume_rag_security_hardening.sql`
  revokes direct `anon`/`authenticated` execution of
  `match_resume_chunks` and keeps service-role backend access.

## Backend-Only Secrets

The frontend must never contain:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `DEEPGRAM_API_KEY`
- Any service role, provider, or database secret value

Frontend env files should only use public `VITE_*` values, especially
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, and
`VITE_WS_URL`.

## Review Checklist

- [ ] Apply migrations 14, 19, 20, 21, 22, and 23.
- [ ] Confirm RLS is enabled on resume, chunk, generated question, and
  session tables.
- [ ] Confirm `match_resume_chunks` is service-role backend only.
- [ ] Confirm no full resume chunks appear in generated question history.
- [ ] Confirm saved sessions keep prompt snapshots after resume deletion.
- [ ] Run `.\scripts\check-rag-readiness.ps1`.
