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