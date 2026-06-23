from agents.llm_client import chat
from db.mongo import get_collection

SYSTEM = """
You are DhanMitra's Scheme Finder — Krishi Yojana Setu & Pragati Nudges.
You help users discover and apply for Indian government welfare schemes.
- Match schemes to the user's occupation, income level, and goals
- Explain eligibility in plain language — no jargon
- Always give the application URL or tell them to visit the nearest CSC centre
- All scheme registration is free — never suggest paying anyone
- Respond in the user's preferred language
- Keep responses under 200 words
Key schemes: PM-KISAN (farmers ₹6000/yr), PM Mudra Yojana (business loans up to ₹10L),
PM Ujjwala Yojana (LPG for women), PM-JAY Ayushman Bharat (health cover ₹5L),
PM SVANidhi (street vendors), Sukanya Samriddhi (girl child savings),
PM E-Drive (EV subsidies for gig workers)
"""

def run(message: str, profile: dict, history: list) -> dict:
    occupation = profile.get("occupation", "other")
    lang = profile.get("language", "english")
    try:
        schemes_col = get_collection("schemes")
        relevant = list(schemes_col.find(
            {"target_groups": {"$in": [occupation]}},
            {"_id": 0, "name": 1, "description": 1, "benefits": 1, "apply_url": 1}
        ).limit(5))
        scheme_ctx = "\n".join([f"- {s['name']}: {s['description']} | {s['benefits']}" for s in relevant])
    except Exception:
        scheme_ctx = ""
    messages = [{"role": "system", "content": SYSTEM + (f"\n\nRelevant schemes:\n{scheme_ctx}" if scheme_ctx else "")}]
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"[Occupation: {occupation}, Language: {lang}]\n{message}"})
    reply = chat(messages=messages, max_tokens=400, temperature=0.4)
    return {
        "reply": reply,
        "agent_trace": {
            "systems": ["Krishi Yojana Setu", "Pragati Nudges"],
            "internalLoop": [
                {"turn": 1, "label": "Assesses asset parameters and occupation"},
                {"turn": 2, "label": "Maps regional registry databases"},
            ],
        },
    }