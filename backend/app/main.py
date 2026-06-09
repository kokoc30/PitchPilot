import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, coaching, health, realtime, resumes, sessions
from app.utils.config import get_settings
from app.websocket.realtime import realtime_endpoint

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="PitchPilot AI Backend",
    description="Task 2 backend foundation for authenticated realtime communication coaching.",
    version="0.1.0",
)

cors_origins = list(
    {
        settings.frontend_url,
        "http://localhost:5473",
        "http://127.0.0.1:5473",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }
)

if settings.extra_cors_origins:
    for origin in settings.extra_cors_origins.split(","):
        origin = origin.strip()
        if origin:
            cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api")
app.include_router(coaching.router, prefix="/api")
app.include_router(realtime.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.websocket("/ws/realtime")(realtime_endpoint)


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "service": "pitchpilot-backend",
        "message": "PitchPilot AI backend foundation is online.",
    }
