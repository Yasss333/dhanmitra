from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.settings import FRONTEND_URL
from api.chat import router as chat_router
from api.profile import router as profile_router
from api.schemes import router as schemes_router
from services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="DhanMitra API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(schemes_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "DhanMitra API"}