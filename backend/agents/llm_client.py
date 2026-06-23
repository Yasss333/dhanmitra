import time
from openai import OpenAI, RateLimitError
from config.settings import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL

client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)

MODELS = [
    DEFAULT_MODEL,
    FALLBACK_MODEL,
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]

def chat(messages: list, max_tokens: int = 500, temperature: float = 0.5) -> str:
    """
    Tries models in order until one works.
    Returns the reply string directly.
    """ 
    last_error = None
    for model in MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content.strip()
        except RateLimitError as e:
            last_error = e
            print(f"[LLM] Rate limited on {model}, trying next...")
            time.sleep(1)
            continue
        except Exception as e:
            last_error = e
            print(f"[LLM] Error on {model}: {e}, trying next...")
            continue

    raise Exception(f"All models failed. Last error: {last_error}")