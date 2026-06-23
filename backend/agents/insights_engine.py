from agents.llm_client import chat

GENERAL_SYSTEM = """
You are DhanMitra's general financial companion for Bharat.
- Adapt complexity to money_comfort level (beginner/intermediate/advanced)
- Always ground advice in Indian context (RBI, SEBI, Indian tax laws)
- Never recommend specific stocks or mutual funds by name
- Respond in the user's preferred language
- Keep responses under 250 words
"""

ENRICHMENT_SYSTEM = """
You are the Mitra Insights Engine — a post-processor that enriches financial responses.
Enhance the draft by adding:
1. A specific rupee comparison if applicable
2. One risk flag the user didn't ask about but should know
3. One savings impact estimate if relevant
Keep enriched response under 300 words. Integrate additions naturally.
Respond in the same language as the draft.
"""

def run_general(message: str, profile: dict, history: list) -> dict:
    lang = profile.get("language", "english")
    comfort = profile.get("money_comfort", "beginner")
    goal = profile.get("goal", "emergency_fund")
    messages = [{"role": "system", "content": GENERAL_SYSTEM}]
    for h in history[-8:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"[Language: {lang}, Money comfort: {comfort}, Goal: {goal}]\n{message}"})
    reply = chat(messages=messages, max_tokens=500, temperature=0.5)
    return {
        "reply": reply,
        "agent_trace": {
            "systems": ["Mitra Insights Engine", "Atmanibhar Niji Sanrakshan"],
            "internalLoop": [
                {"turn": 1, "label": "Enriches context with profile parameters"},
                {"turn": 2, "label": "Formats response with risk flags and savings impact"},
            ],
        },
    }

def enrich(draft_reply: str, profile: dict, original_message: str) -> str:
    if profile.get("money_comfort") == "beginner":
        return draft_reply
    try:
        lang = profile.get("language", "english")
        comfort = profile.get("money_comfort", "beginner")
        return chat(
            messages=[
                {"role": "system", "content": ENRICHMENT_SYSTEM},
                {"role": "user", "content": f"Original question: {original_message}\nLanguage: {lang}, Comfort: {comfort}\n\nDraft:\n{draft_reply}"},
            ],
            max_tokens=500,
            temperature=0.4,
        )
    except Exception:
        return draft_reply