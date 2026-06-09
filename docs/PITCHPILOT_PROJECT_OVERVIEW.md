# PitchPilot AI — Project Overview

## 1. One-Sentence Summary
PitchPilot AI is a real-time, AI-powered interview and pitch-practice platform that leverages webcam tracking, speech analysis, and customized RAG resume questioning to provide users with actionable communication feedback and coaching reports.

## 2. Problem We Are Solving
Students, job seekers, and presenters often practice interviews or pitches alone without meaningful feedback. They may not know if they speak too fast, use filler words, avoid the camera, pause too much, or give unclear answers. Traditional mock interviews require another person, and generic AI chat tools do not measure delivery, camera presence, or resume-specific interview readiness.

## 3. Solution
PitchPilot AI solves this problem by combining webcam analysis, microphone/transcript analysis, resume-based RAG question generation, AI coaching, scoring, and saved session history into one unified practice platform. Users can simulate a high-pressure interview environment that analyzes their visual engagement, evaluates verbal delivery, generates contextual questions based on their resume, calculates a deterministic communication score, and provides professional AI coaching insights that can be saved and reviewed.

## 4. Target Users
- Students preparing for internships or new-grad interviews.
- Job seekers preparing for technical or behavioral interviews.
- Founders practicing startup pitches.
- Public speakers practicing delivery.
- Career centers or mentors reviewing practice performance.

## 5. Core Functionality

### Authentication
- User signup and login integration.
- Supabase authentication as the identity provider (JWT based).
- Protected practice and dashboard pages.

### Practice Session
- Interactive camera and microphone enablement/controls.
- A unified practice setup section for configuring the session.
- Real-time streaming transcription mapping user speech.
- Live speech and visual metrics updating dynamically.
- Ability to intentionally skip questions, end, or stop the session early.

### MediaPipe Visual Analysis
The frontend uses MediaPipe and browser-based tracking to analyze visual communication signals in real-time, such as:
- Face visibility and overall presence.
- Camera-facing / eye-contact proxy for active engagement.
- Posture and body presence centering in the frame.
- Continuous engagement signal to ensure user focus.
- Webcam-based delivery feedback that runs entirely client-side.

### Speech and Transcript Analysis
The application tracks the user's verbal delivery, calculating:
- Words per minute / pace to gauge rushing or dragging.
- Frequency and types of filler words.
- Pauses and speech gaps affecting fluidity.
- Total word count and transcript content.
- Speaking activity tracking to generate accurate transcript timelines.

### Resume-Based RAG Interview Questions
The backend utilizes user resume uploads, embeddings, and vector retrieval (RAG) to generate highly personalized interview questions grounded explicitly in the user's resume:
- Resume document upload and selection capabilities.
- Intelligent extraction and chunking of the resume text.
- Text embeddings generated for spatial similarity searches.
- Storage and querying using pgvector in Supabase vector search.
- Dynamically generated interviewing questions mapped to candidate experience.
- Interactive question queue managed during the session.
- Selected question context seamlessly flowing into the final AI coaching report, saved session, and dashboard.

### Question Queue UX
- Queue of generated questions linked to real-time interaction.
- First question is auto-selected upon starting.
- Current active question is pinned beside the camera view.
- Granular control with Next / Previous / Skip actions.
- End button to gracefully finish early.
- Question history is kept secondary and collapsed for minimal UI distraction.
- Ending the session does not delete the transcript or selected question contexts.

### Communication Score
The final scoring system encapsulates the user's performance:
- Live signals update dynamically while practicing without blocking interactions.
- A final Communication Score appears prominently after the session ends.
- The final score is based on clarity, pace, delivery, engagement, and camera-facing status.
- UI supports nuanced states including `ready`, `limited_data`, and `insufficient_data`.
- Final score persists on screen until a new session begins or a reset action is performed.

### Smart Backend Deterministic Scoring Backup
- The frontend captures a final snapshot of metrics and scoring before stopping camera/mic feeds.
- The backend includes a robust deterministic scoring backup service.
- If the frontend sends zero or missing scores unexpectedly, the backend can recompute the score procedurally from the saved transcript and metrics.
- The backend explicitly avoids using the LLM to "invent" or hallucinate numeric scores.
- This layer protects the integrity of saved sessions and dashboard historical data.

### AI Coaching Report
- Generates thorough, actionable feedback after the practice concludes.
- Aggregates the final transcript, selected prompt/question, calculated metrics, and overall score.
- Delivers rich coaching insights aiming to improve the targeted communication areas.

### Save Session and Dashboard
- Users can persist their practice sessions successfully to the database.
- A historical dashboard lists all past sessions.
- In-depth session detail view available.
- Securely retrieves the saved transcript, timeline metrics, coaching report, and final score.
- Allows retrospective progress review over multiple practice rounds.


## 6. Technical Architecture

### Frontend
- **React & TypeScript:** High-performance single page application framework.
- **Vite:** Next generation frontend tooling.
- **Tailwind CSS & Framer Motion:** For modern styling and smooth layout animations.
- **MediaPipe:** Client-side, browser-based webcam analysis and face-tracking algorithms.
- **Web Audio:** For robust microphone capture and chunk processing.
- **WebSocket Client:** Realtime duplex connection for transcript and metric streaming.
- **Zustand:** Comprehensive state management and hooks lifecycle handling for practice steps, scores, metrics, and session persistence.

### Backend
- **Python & FastAPI:** High concurrency REST API and backend infrastructure.
- **WebSocket Endpoints:** Dedicated route (`/ws/realtime`) to handle chunked audio streaming and real-time transcription delivery.
- **Supabase Integration:** Communicates tightly with Supabase for data access, authentication, and SQL interactions.
- **RAG & Vector Services:** Orchestrates the resume chunking, embedding, vector search filtering (`pgvector`), and LLM prompting for personalized interview questions.
- **Deterministic Validation:** Backend components rigorously recompute and validate streaming front-end metrics against hard rules rather than LLM guesswork.
- **AI Orchestration:** Structured orchestration layer communicating cleanly with external LLM Providers (OpenAI/Gemini).

### Database / Supabase
- **Supabase Auth:** Enterprise-grade security handling identity management and token provisioning.
- **Supabase Postgres:** Primary relational storage mechanism for application data.
- **Row Level Security (RLS):** Strict multi-tenant data segmentation ensuring users only query their own artifacts.
- **pgvector:** Core foundation enabling text similarity queries bridging user resumes.
- **Tables Designed:** Scalable schema handling tables for sessions, user transcripts, continuous metrics, generated reports, retry comparisons, resume documents, resume chunks, and question histories.

### AI / RAG
- **Text Chunking Pipeline:** Converts uploaded resume files into semantic segments.
- **Embeddings Pipeline:** Utilizes embedding models to map textual chunks into mathematical vectors.
- **Vector Search Engine:** Leverages Supabase to perform closest k-nearest neighbor lookups linking targeted questions to relevant resume blocks.
- **AI Contextualization:** Flows selected specific questions to form structured prompts mapped to external AI providers.
- **Provider Switching:** Built with interface abstractions permitting interchangeable AI provider options based on environment variables.

### Deployment
- **Render Blueprint (`render.yaml`):** Infrastructure-as-code deploying the backend and static sites seamlessly.
- **Backend FastAPI Web Service:** Deploys backend API.
- **Frontend Static Web Service:** Hosts the compiled production Vite frontend.
- **Production Environment Variables:** Secure credentials managing production access.
- **HTTPS API URL & WSS WebSocket URL:** Utilizes core HTTPS for API URLs and secure WSS for WebSocket integration.
- **Supabase Redirect URLs:** Controlled Auth redirect URLs ensuring seamless login flows.

## 7. End-to-End User Flow
1. User signs up/logs in through the secure portal.
2. User opens Practice.
3. User enables their camera and microphone after granting browser permissions.
4. User uploads or selects a pre-uploaded resume.
5. App leverages backend RAG to generate targeted, resume-grounded questions.
6. User begins speaking; their answer is transcribed while live metrics update in real-time.
7. User navigates questions via Next/Skip, or concludes by clicking End.
8. The camera and microphone disconnect securely right after the session concludes.
9. An aggregated, final Communication Score appears on screen.
10. User triggers the generation of an AI coaching report summarizing their performance.
11. User saves the completed session to their account.
12. User opens the Dashboard to review session history and read detailed feedback on previous runs.

## 8. What Makes This Project Unique
- Combines verbal (speech/transcript) and visual (webcam MediaPipe signals) communication feedback.
- Uses client-side MediaPipe analysis algorithms for robust delivery signals (posture, eye contact).
- Uses RAG (retrieval-augmented generation) to personalize interview questions dynamically grounded from a specific, real resume.
- Gives real-time metrics visibility during the pitch plus an objective final summary scoring system.
- Supports comprehensive saved progress history, a dashboard timeline, and retrospective evaluation.
- Designed directly as a full-stack, deployable SaaS product featuring backend architecture and cloud patterns, bypassing constraints of simple chatbot software patterns.

## 9. Current Implemented Features
- [x] Secured User Authentication (Login / Signup via Supabase).
- [x] Client-side Webcam tracking via MediaPipe.
- [x] Real-time audio streaming for transcription via WebSockets.
- [x] Resume upload functionality and database tracking.
- [x] Resume NLP chunking, embeddings generation, and storage (`pgvector`).
- [x] Personalized Interview Question generation via AI.
- [x] Session persistence saving to dashboard timeline.
- [x] Finalized Communication score integration.
- [x] AI Coaching report generation.
- [x] Supabase Row Level Security configurations isolating multi-tenancy.

## 10. Known Limitations / Future Improvements
- Stronger calibration for scoring: Refining deterministic score penalty curves.
- More advanced emotion and body-language analysis beyond face tracking.
- Better mobile camera support (handling restricted constraints on mobile hardware for inference).
- More detailed interview categories (consulting frameworks, advanced technical logic).
- Recruiter/mentor review mode access permissions to audit mock interview completions.
- More robust production monitoring telemetry platforms.
- Improved deployment scaling expanding beyond base Render tiers.

## 11. Environment Variables Overview
*Note: Secret values are completely abstracted using cloud environment injection workflows.*
- **Frontend VITE variables:** Connecting the unauthenticated SPA layers to Supabase, API, and WebSocket channels.
- **Backend Supabase variables:** Environment pointers linking Python logic to Supabase relational databases.
- **Service role key server-only:** Securing background processing and administrative access isolated strictly to the backend.
- **AI provider keys:** Private tokens authenticating OpenAI/Gemini orchestrators.
- **Transcription provider keys:** Service tokens allocated for real-time WebSocket transcription endpoints.
- **Frontend/Backend URLs:** Configuring required Cross-Origin (CORS) boundaries and Auth domains.
- **WebSocket URL:** WSS mapping required for backend streaming topology.

## 12. Security and Privacy Notes
- **Service Role Key secrecy:** Safely encapsulated only inside the backend service; explicitly never exposed to frontend packages.
- **User Data Isolation:** User transcripts, sessions, and history data are strictly compartmentalized and protected by Supabase Auth and Row Level Security (RLS) rules.
- **Resume Protection:** Raw resume payload texts should not be leaked unnecessarily; chunks and vectors remain decoupled and tightly joined to an explicit user access token.
- **Session Boundaries:** Saved sessions strictly belong to the user identity associated dynamically.
- **Environment Management:** Hardcoded operational keys do not exist in the source codebase. Secrets seamlessly trace to standard variables.

## 13. Demo Script
To experience PitchPilot AI in action, follow this short flow:
1. Login to the application.
2. Start an interactive practice session.
3. Upload/Select an example resume.
4. Generate specialized real-time questions.
5. Answer one queued question speaking transparently to the active camera metrics.
6. Click End to terminate streaming hooks.
7. Show your calculated final delivery score.
8. Generate the AI Coaching report to read automated recommendations.
9. Save the finalized session context.
10. Open the dashboard tab to view your saved metrics timeline securely.

## 14. Short Version for Teammates
**PitchPilot AI** is a real-time pitch and interview practice platform. It combines frontend browser MediaPipe camera-tracking with WebSockets to analyze visual engagement (like eye contact and posture) and verbal delivery (pace, filler words) simultaneously. It uses backend RAG (pgvector) to read uploaded user resumes and dynamically generate context-aware questions. Users get a live communication score overlaid against real-time signals, backed up by rigorous deterministic backend validation protecting the integrity of dashboard history. It's built on a modern stack (Vite/React, Python/FastAPI, Supabase) ensuring true production-ready deployments.
