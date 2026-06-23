from openai import OpenAI
from config.settings import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, DEFAULT_MODEL
client = OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)
r = client.chat.completions.create(
    model=DEFAULT_MODEL,
    messages=[{'role':'user','content':'say hi in Hindi, 1 sentence'}],
    max_tokens=30
)
print('OK:', r.choices[0].message.content)
