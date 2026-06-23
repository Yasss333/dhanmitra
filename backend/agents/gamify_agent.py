from agents.llm_client import chat

SYSTEM = """
You are DhanMitra's Financial Fitness Coach — Pragati Gamify Engine.
You create scenario-based financial literacy challenges.
- Create a realistic situation relevant to the user's occupation and region
- Give exactly 3 options, one clearly correct
- After the user answers, explain WHY with real rupee consequences if possible
- Keep language simple — no jargon
- Respond in the user's preferred language
"""

def run(message: str, profile: dict, history: list) -> dict:
    lang = profile.get("language", "english")
    occupation = profile.get("occupation", "other")
    messages = [{"role": "system", "content": SYSTEM}]
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"[Occupation: {occupation}, Language: {lang}]\n{message}"})
    reply = chat(messages=messages, max_tokens=400, temperature=0.6)
    return {
        "reply": reply,
        "agent_trace": {
            "systems": ["Pragati Gamify Engine"],
            "internalLoop": [
                {"turn": 1, "label": "Generates scenario for occupation profile"},
                {"turn": 2, "label": "Scores response and updates fitness index"},
            ],
        },
    }