from agents.llm_client import chat

SYSTEM = """
You are DhanMitra's Companion Tracker — Yuva Swavalamban Core.
You help users with budgeting, savings, and income tracking — especially for irregular earners.
- Never assume a fixed monthly salary
- Give specific rupee-level advice, not vague tips
- For gig/daily workers: think in daily and weekly cycles, not monthly
- Highlight savings rate and emergency fund building
- Respond in the user's preferred language
- Keep responses practical and under 200 words
"""

def run(message: str, profile: dict, history: list) -> dict:
    lang = profile.get("language", "english")
    occupation = profile.get("occupation", "other")
    messages = [{"role": "system", "content": SYSTEM}]
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"[Occupation: {occupation}, Language: {lang}]\n{message}"})
    reply = chat(messages=messages, max_tokens=350, temperature=0.4)
    return {
        "reply": reply,
        "agent_trace": {
            "systems": ["Yuva Swavalamban Core"],
            "internalLoop": [
                {"turn": 1, "label": "Assesses income pattern and cash flow"},
                {"turn": 2, "label": "Tracks spending profile"},
            ],
        },
    }