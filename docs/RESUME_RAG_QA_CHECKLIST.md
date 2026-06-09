# Resume RAG QA Checklist

## Static Checks

- [ ] `cd backend && python -m compileall app`
- [ ] `cd frontend && npm run build`
- [ ] `.\scripts\check-rag-readiness.ps1`
- [ ] Frontend env files contain no backend-only secret names.
- [ ] `README.md` documents supported file types, pgvector, migrations,
  privacy boundaries, troubleshooting, and limitations.

## API Checks

- [ ] `GET /health` returns 200.
- [ ] `GET /api/diagnostics` returns 200.
- [ ] `GET /api/resumes/status` returns 200.
- [ ] `GET /api/resumes` without auth returns 401.
- [ ] Authenticated `GET /api/resumes` returns only the current user's
  resumes.
- [ ] Authenticated `GET /api/resumes/{resume_id}` returns only short
  previews.
- [ ] Authenticated `GET /api/resumes/{resume_id}/retrieval-preview`
  returns short snippets only.
- [ ] Authenticated `POST /api/resumes/{resume_id}/questions/generate`
  returns questions and bounded `groundedIn`.
- [ ] Authenticated question history list/update/delete works only for
  owned resume and question ids.
- [ ] `POST /api/coaching/report` works with and without prompt context.
- [ ] `POST /api/sessions` persists the selected prompt snapshot only.
- [ ] `GET /api/sessions/{id}` includes prompt snapshot, not raw resume
  chunks.

## Browser RAG Flow

- [ ] Login.
- [ ] Open Practice.
- [ ] Select Interview mode.
- [ ] Upload/select a PDF, DOCX, or TXT resume.
- [ ] Generate questions.
- [ ] Favorite/unfavorite a saved question.
- [ ] Filter/search history.
- [ ] Click "Practice this".
- [ ] Confirm Current Practice prompt updates.
- [ ] Generate AI report.
- [ ] Save Session.
- [ ] Open Dashboard detail and confirm practiced question appears.
- [ ] Delete resume.
- [ ] Confirm question history is gone.
- [ ] Confirm saved session prompt snapshot remains.
- [ ] Confirm no console errors and no full resume chunks are visible.

## Non-RAG Regression

- [ ] Home works.
- [ ] Login/signup works.
- [ ] Dashboard works.
- [ ] Practice works without a resume.
- [ ] Non-interview modes work.
- [ ] Demo Mode works.
- [ ] Webcam permission and preview work.
- [ ] Microphone permission and levels work.
- [ ] Transcript flow works.
- [ ] Metrics and deterministic scoring work.
- [ ] AI report works without a prompt.
- [ ] Retry comparison works.
- [ ] Save Session works.
- [ ] Deployment build config still passes.

## Negative Cases

- [ ] Unsupported file type returns a clear 422.
- [ ] Too-large file returns a clear 422.
- [ ] Empty/scanned PDF extraction returns a clear 422.
- [ ] Missing backend service role returns a clear 503.
- [ ] Missing RAG migrations return clear migration guidance.
- [ ] Missing `match_resume_chunks` falls back to Python retrieval when
  tables are present.
- [ ] Missing question-history table returns a warning while generated
  questions remain usable in-session.
- [ ] Wrong-user resume/question/session access returns 403 or 404.
