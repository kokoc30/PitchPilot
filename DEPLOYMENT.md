# PitchPilot AI Deployment Guide

PitchPilot AI is designed to be deployed across a decoupled architecture:
1. **Frontend:** React/Vite Single Page Application (SPA). Recommended: Vercel or Netlify.
2. **Backend:** FastAPI Python application with WebSocket support. Recommended: Render, Railway, or Fly.io.
3. **Database/Auth:** Supabase.

## 1. Supabase Production Setup

Before deploying the frontend and backend, prepare your Supabase project:
- **Authentication URL:** Go to Supabase Authentication -> URL Configuration. Set the Site URL to your production frontend URL (e.g., `https://pitchpilot.vercel.app`).
- **Redirect URLs:** Add your frontend URL to the Redirect URLs list. Keep `http://localhost:5473` if you want local development to keep working against the production Supabase instance.
- **SQL Migrations:** Ensure the SQL migrations for `practice_sessions`, Resume RAG tables, question history, and the RAG-5 `match_resume_chunks` hardening migration have been run.
- **RLS Policies:** Confirm Row Level Security is enabled on your tables.
- **Keys:** 
  - The `anon`/`public` key is safe to put in your frontend `.env`.
  - The `service_role` key MUST be kept strictly in your backend host environment.

## 2. Environment Variables

### Frontend Variables (Browser Safe)
*Place these in your Vercel/Netlify dashboard. Do not commit `.env.production`.*

| Variable | Description |
|---|---|
| `VITE_API_URL` | e.g. `https://your-backend.onrender.com` |
| `VITE_WS_URL` | e.g. `wss://your-backend.onrender.com/ws/realtime` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public key |

### Backend Variables (Strictly Secret)
*Place these in your Render/Railway secret manager.*

| Variable | Description |
|---|---|
| `API_ENV` | Set to `production` |
| `FRONTEND_URL` | Your frontend production URL (used for CORS) |
| `EXTRA_CORS_ORIGINS` | (Optional) Comma-separated list of other allowed origins |
| `BACKEND_PUBLIC_URL` | (Optional) The public URL of the backend itself |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL:** Your Supabase secret service role key |
| `OPENAI_API_KEY` | (Optional) OpenAI key |
| `GEMINI_API_KEY` | (Optional) Gemini key |
| `DEEPGRAM_API_KEY` | (Optional) Deepgram key |
| `TRANSCRIPTION_PROVIDER` | `auto`, `mock`, or `deepgram` |
| `LLM_PROVIDER` | `auto`, `mock`, `openai`, or `gemini` |
| `LLM_FALLBACK_TO_MOCK` | `true` or `false` |

## 3. Deployment Steps

### Frontend (Vercel)
1. Import the repository into Vercel.
2. Set the Root Directory to `frontend`.
3. Framework Preset: Vite.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add the Frontend Environment Variables.
7. Deploy.
*(Note: A `vercel.json` is provided in the repository to handle SPA route rewrites.)*

### Backend (Render)
1. Create a new Web Service in Render.
2. Root Directory: `backend`
3. Environment: `Python 3`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add the Backend Environment Variables.
7. Deploy.
*(Note: A `render.yaml` is provided if you wish to use Blueprint deployment.)*

## 4. Post-Deployment Smoke Test
1. Visit your frontend URL.
2. Login to your account.
3. Open `/practice` and start a Demo session.
4. Test the Backend Health by visiting `https://your-backend-url/health` in your browser (should return `{"status":"ok"}`).
5. Test the Backend Diagnostics by visiting `https://your-backend-url/api/diagnostics`.
6. Enable the camera/microphone in a real session (requires HTTPS).

## 5. Troubleshooting
- **CORS Errors:** Ensure your `FRONTEND_URL` matches exactly (no trailing slash).
- **WebSocket Fails:** Ensure your `VITE_WS_URL` is `wss://` and not `ws://` in production.
- **Save Session Fails:** Verify the `SUPABASE_SERVICE_ROLE_KEY` is present in the backend.
- **Resume RAG Fails:** Verify pgvector is enabled and migrations `2026_task19` through `2026_task23` are applied in order.
- **Permissions Denied:** Ensure you are accessing the frontend over `https://`, as browsers block microphone/camera over plain HTTP (except localhost).
