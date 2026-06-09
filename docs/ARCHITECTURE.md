# PitchPilot AI Architecture

## Frontend Responsibilities

The frontend is a Vite React TypeScript application. It owns routing, layout, dark SaaS UI, local Zustand state, Supabase Auth session bootstrap, protected routes, placeholder practice panels, API helper functions, WebSocket client helpers, and future browser-side MediaPipe integration.

## Backend Responsibilities

The backend is a FastAPI service. It owns health checks, diagnostics, placeholder login/signup guidance routes, JWT verification for `/api/auth/me`, placeholder realtime status routes, WebSocket handling, environment configuration, and future service boundaries for transcription, AI coaching, scoring, and persistence.

## Authentication Role

Supabase Auth is the browser-facing identity provider. The frontend signs users in and stores the Supabase session through the Supabase JS client. Backend routes that need identity should require a bearer token and use the compact JWT helper in `backend/app/utils/auth.py`.

## WebSocket Role

`/ws/realtime` is the realtime transport foundation. In Task 1 it accepts connections, sends an initial connected event, receives text messages, and echoes structured JSON. Later tasks can route microphone chunks, transcript updates, delivery metrics, and coaching events through this channel.

## Future AI And Computer Vision

OpenAI, Gemini, Deepgram or Whisper, and MediaPipe are represented by clean placeholders only. Future integrations should live behind service/helper modules rather than being embedded directly in pages or route handlers.

## Future Supabase Persistence

Supabase PostgreSQL will later store users, sessions, transcript segments, scores, and coaching summaries. Task 1 does not connect to a database or require Supabase secrets.
