from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.settings import FRONTEND_URL, TELEGRAM_WEBHOOK_URL
from api.chat import router as chat_router
from api.profile import router as profile_router
from api.schemes import router as schemes_router
from api.payments import router as payments_router
from api.razorpay_payments import router as razorpay_router
from services.scheduler import start_scheduler, stop_scheduler
from api.telegram import router as telegram_router
from api.telegram_link import router as telegram_link_router
from api.telegram import telegram_service
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    if TELEGRAM_WEBHOOK_URL:
        try:
            await telegram_service.set_webhook(TELEGRAM_WEBHOOK_URL)
        except Exception as exc:
            print(f"[WARN] Could not register Telegram webhook: {exc}")
    yield
    stop_scheduler()
    await telegram_service.close()

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
app.include_router(payments_router, prefix="/api")
app.include_router(razorpay_router, prefix="/api")
app.include_router(telegram_router, prefix="/api")
app.include_router(telegram_link_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "DhanMitra API"}