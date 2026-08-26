from dotenv import load_dotenv
import os

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "Dhan-mitra-proto")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

DEFAULT_MODEL = "google/gemma-4-31b-it:free"
FALLBACK_MODEL = "meta-llama/llama-3.2-3b-instruct:free"

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


TELEGRAM_BOT_TOKEN=os.getenv("TELEGRAM_BOT_TOKEN")

TELEGRAM_WEBHOOK_URL=os.getenv("TELEGRAM_WEBHOOK_URL")
TELEGRAM_WEBHOOK_SECRET=os.getenv("TELEGRAM_WEBHOOK_SECRET")
# ----- LanceDB (Vector Store for RAG) -----
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "./vector_store")

# Add this to your settings.py
WHATSAPP_BRIDGE_URL = os.getenv("WHATSAPP_BRIDGE_URL", "http://localhost:3001")


SETU_CLIENT_ID = os.getenv("SETU_CLIENT_ID")
SETU_CLIENT_SECRET = os.getenv("SETU_CLIENT_SECRET")
SETU_PRODUCT_INSTANCE_ID = (os.getenv("SETU_PRODUCT_INSTANCE_ID") or os.getenv("SETU_MERCHANT_ID") or "").strip()
SETU_ENVIRONMENT = os.getenv("SETU_ENVIRONMENT", "sandbox")  # sandbox | production
