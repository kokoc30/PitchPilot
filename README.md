# PitchPilot AI

PitchPilot AI is an AI-powered interview and pitch-practice platform. It combines MediaPipe visual analysis, realtime speech analysis, resume-based RAG question generation, AI coaching reports, and communication scoring into one cohesive practice suite.

## Problem

Candidates often practice interviews or pitches alone and lack meaningful feedback on their delivery, confidence, pacing, engagement, and resume-specific questions. Traditional mock interviews require another person, and generic AI chat tools fail to measure live camera presence, delivery skills, or provide personalized interview context.

## Solution

PitchPilot AI solves this by combining webcam analysis, speech analysis, resume-grounded interview questions, and AI coaching into a single platform. It provides candidates with a fully independent, data-driven practice environment that acts as a real-time communication coach.

## Key Features

- Resume-based RAG interview questions
- MediaPipe camera analysis
- Realtime transcript and speech metrics
- Communication Score
- AI Coaching Reports
- Session History Dashboard
- Secure Authentication
- Supabase + pgvector
- Render deployment support

## How It Works

1. Login securely
2. Upload or select a resume
3. Generate resume-grounded questions
4. Practice with camera and microphone
5. Receive realtime feedback
6. End session
7. Generate report
8. Save session
9. Review dashboard history

## Tech Stack

| Area | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, MediaPipe |
| **Backend** | Python, FastAPI, WebSockets |
| **AI & Data** | RAG, Embeddings, Supabase, PostgreSQL, pgvector |
| **Deployment** | Render, Supabase |

## Architecture

```text
User
 ↓
React Frontend (MediaPipe, WebAudio)
 ↓
FastAPI Backend (WebSockets)
 ↓
RAG + AI Services
 ↓
Supabase + pgvector
```

## Highlights

- Personalized interview questions using resume RAG
- Real-time visual and verbal feedback
- Deterministic scoring with backend validation
- AI-powered coaching reports
- Session persistence and progress tracking

## Project Status

Current features implemented:
- Authentication
- Resume RAG
- MediaPipe analysis
- Communication scoring
- AI coaching reports
- Dashboard and session history

## Local Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

*Note: Environment variables are required for both frontend and backend.*

## Deployment

- Render Blueprint (`render.yaml`)
- Supabase
- Environment variables

## Screenshots

### Practice Session
*(Screenshot placeholder)*

### Communication Score
*(Screenshot placeholder)*

### Dashboard
*(Screenshot placeholder)*

### AI Coaching Report
*(Screenshot placeholder)*

## License

License to be determined.
