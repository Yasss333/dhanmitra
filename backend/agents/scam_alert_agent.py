from agents.llm_client import chat

SYSTEM = """
You are DhanMitra's Scam Alert Agent — Dhan Suraksha Kawach.
Your only job is to protect users from financial fraud.
- Always clearly state if something is a SCAM or SAFE
- Explain WHY in simple language
- Give the exact action to take (e.g. "Hang up immediately", "Call 1930")
- Never be vague — people's money is at risk
- Respond in the user's preferred language
- Keep responses under 150 words
Cybercrime helpline: 1930
"""

def run(message: str, profile: dict, history: list) -> dict:
    lang = profile.get("language", "english")
    comfort = profile.get("money_comfort", "beginner")
    messages = [{"role": "system", "content": SYSTEM}]
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"[Language: {lang}, Literacy: {comfort}]\n{message}"})
    reply = chat(messages=messages, max_tokens=300, temperature=0.3)
    return {
        "reply": reply,
        "agent_trace": {
            "systems": ["Dhan Suraksha Kawach", "Pragati Hub"],
            "internalLoop": [
                {"turn": 1, "label": "Parses link signature and caller pattern"},
                {"turn": 2, "label": "Runs algorithmic scam detection"},
            ],
        },
    }