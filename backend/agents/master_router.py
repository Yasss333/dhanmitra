import json
from agents.llm_client import chat
from agents.guardrails import RouterOutput

ROUTE_SYSTEM = """
You are the DhanMitra Master Router. Given a user message and their profile,
decide which specialized agent(s) should handle the query.

Return ONLY a valid JSON object in this exact shape — no extra text, no markdown:
{
  "agents": ["scam_alert" | "scheme_finder" | "tracker" | "gamify" | "general"],
  "intent": "one sentence describing what the user needs",
  "language": "hindi" | "marathi" | "kannada" | "english"
}

Agent selection rules:
- scam_alert: fraud, OTP, lottery, unknown calls, suspicious links, cybercrime
- scheme_finder: government schemes, PM-KISAN, subsidies, welfare programs, eligibility
- tracker: budget, expenses, income, savings, goals, spending
- gamify: quiz, challenge, financial fitness, test my knowledge
- general: financial advice, comparisons, explanations, anything else
"""

def route_message(message: str, profile: dict) -> dict:
    profile_ctx = (
        f"Occupation: {profile.get('occupation')}, "
        f"Language: {profile.get('language')}, "
        f"Money comfort: {profile.get('money_comfort')}, "
        f"Goal: {profile.get('goal')}"
    )
    try:
        raw = chat(
            messages=[
                {"role": "system", "content": ROUTE_SYSTEM},
                {"role": "user", "content": f"Profile: {profile_ctx}\nMessage: {message}"},
            ],
            max_tokens=200,
            temperature=0,
        )
        # Strip markdown fences if model adds them
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        parsed = json.loads(raw)
        validated = RouterOutput(**parsed)
        return validated.model_dump()
    except Exception:
        return {
            "agents": ["general"],
            "intent": message,
            "language": profile.get("language", "english"),
        }