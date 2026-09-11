from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import re
import json
from services.memory import get_recent_messages, append_message, get_session_messages, get_user_sessions
from agents.agno_agents import AgentRouter
from services.whatsapp_service import whatsapp_service
from services.payment_payloads import resolve_payment_payload

router = APIRouter()

# ──────────────────────────────────────────────────────────────
# PERSISTENT MEMORY – HEURISTIC FALLBACK
# Extracts financial facts the user mentions (income, expenses,
# savings goal, named goal) and writes them to the user's profile
# in MongoDB. Runs in addition to the LLM 'update_user_memory' tool,
# so memory is captured even if the model forgets to call the tool.
# ──────────────────────────────────────────────────────────────

MONTHLY_INCOME_PATTERNS = [
    r"(?:my\s+)?(?:monthly\s+)?salary\s+(?:is|of|=\s*)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:i\s+)?(?:earn|make|get)\s+(?:about\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)\s*(?:per\s+month|monthly|a\s+month)",
    r"income\s+(?:is|of)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
]
EXPENSE_PATTERNS = [
    r"(?:my\s+)?(?:monthly\s+)?(?:expenses|spending|expenditure)\s+(?:are|is|of)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:i\s+)?(?:spend|spend\s+about)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)\s*(?:per\s+month|monthly)",
]
GOAL_AMOUNT_PATTERNS = [
    r"(?:savings\s+)?goal\s+(?:amount\s+)?(?:is|of)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:want|need|save|build)\s+(?:a|an|to|up)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)\s*(?:emergency\s+fund|corpus|goal)?",
]
GOAL_KEYWORDS = ["emergency fund", "new house", "buy a house", "retirement", "education fund", "trip", "vacation", "wedding", "car", "house"]
GOAL_NAME_PATTERNS = [
    r"(?:want|plan|goal|build|save for|create|set up|target).*?\b(" + "|".join(g.replace(" ", r"\s+") for g in GOAL_KEYWORDS) + r")\b"
]
EMI_PATTERNS = [
    r"(?:my\s+)?(?:current\s+)?(?:monthly\s+)?(?:emi|EMI)\s+(?:is|of|=\s*)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:i\s+)?(?:pay|have)\s+(?:about\s+)?(?:an\s+)?(?:emi|EMI)\s+(?:of\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:take|want|considering)\s+(?:another\s+)?(?:new\s+)?(?:emi|EMI|loan)\s+(?:of\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
]
LOAN_PATTERNS = [
    r"(?:my\s+)?(?:loan|debt)\s+(?:is|amount|outstanding)\s+(?:of\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)",
    r"(?:i\s+)?(?:have|owe)\s+(?:about\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\s*[kK])?)\s*(?:in\s+loans|debt)",
]
SCHEME_KEYWORDS = ("scheme", "yojana", "subsidy", "pension", "welfare", "government benefit")


def _parse_amount(raw: str):
    if not raw:
        return None
    raw = raw.strip().replace(",", "")
    mult = 1000 if raw.endswith(("k", "K")) else 1
    if raw.endswith(("k", "K")):
        raw = raw[:-1]
    try:
        return int(float(raw) * mult)
    except ValueError:
        return None


def persist_memory_from_message(user_id: str, message: str):
    """Extract financial facts from a user message and save them to the user's profile."""
    if not user_id or user_id == "anonymous" or not message:
        return

    from db.mongo import get_collection
    from datetime import datetime, timezone
    col = get_collection("users")
    existing = col.find_one({"user_id": user_id}) or {}

    updates = {}
    text = message.lower()

    for pat in MONTHLY_INCOME_PATTERNS:
        m = re.search(pat, text)
        if m:
            val = _parse_amount(m.group(1))
            if val:
                updates["monthly_income"] = val
            break

    for pat in EXPENSE_PATTERNS:
        m = re.search(pat, text)
        if m:
            val = _parse_amount(m.group(1))
            if val:
                updates["monthly_expenses"] = val
            break

    for pat in GOAL_AMOUNT_PATTERNS:
        m = re.search(pat, text)
        if m:
            val = _parse_amount(m.group(1))
            if val:
                updates["savings_goal_amount"] = val
            break

    for pat in GOAL_NAME_PATTERNS:
        m = re.search(pat, text)
        if m:
            name = m.group(1).strip()
            goals = list(existing.get("goals") or [])
            if name not in goals:
                goals.append(name)
            updates["goals"] = goals
            break

    # EMI-specific pattern extraction
    current_emi = None
    for pat in EMI_PATTERNS:
        m = re.search(pat, text)
        if m:
            current_emi = _parse_amount(m.group(1))
            break

    # If EMI found, check if user is asking about taking another EMI
    new_emi = None
    if current_emi and "take" in text or "want" in text or "another" in text:
        for pat in EMI_PATTERNS:
            m = re.search(pat, text)
            if m:
                new_emi = _parse_amount(m.group(1))
                break

    # Extract loan amounts
    loan_amount = None
    for pat in LOAN_PATTERNS:
        m = re.search(pat, text)
        if m:
            loan_amount = _parse_amount(m.group(1))
            break

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        # users collection has a legacy unique index on userId; set both to avoid null collisions
        col.update_one(
            {"user_id": user_id},
            {"$set": {**updates, "userId": user_id, "user_id": user_id}},
            upsert=True,
        )
        print(f"[MEMORY] Persisted for {user_id}: {list(updates.keys())}")

    return {
        "current_emi": current_emi,
        "new_emi": new_emi,
        "loan_amount": loan_amount
    }


def _demo_scheme_reply(profile: dict, message: str):
    """Return seeded occupation-specific schemes without an LLM tool round-trip."""
    text = message.lower()
    if not any(keyword in text for keyword in SCHEME_KEYWORDS):
        return None

    occupation = profile.get("occupation")
    if not occupation:
        return None

    from db.mongo import get_collection

    schemes = list(get_collection("schemes").find(
        {"target_groups": {"$in": [occupation]}},
        {"_id": 0},
    ).limit(5))
    if not schemes:
        return None

    lines = [f"Here are government schemes relevant to you as a {occupation.replace('_', ' ')}:"]
    for index, scheme in enumerate(schemes, 1):
        eligibility = "; ".join(scheme.get("eligibility") or [])
        lines.append(
            f"{index}. {scheme.get('name')}: {scheme.get('description')}. "
            f"Benefits: {scheme.get('benefits')}. Eligibility to check: {eligibility}. "
            f"Apply: {scheme.get('apply_url')}"
        )
    lines.append("Eligibility can depend on income, age, documents, location, and other conditions. Government scheme registration is free.")
    return "\n\n".join(lines)


def _demo_profile_reply(profile: dict, message: str):
    text = message.lower()
    profile_question = (
        ("know" in text and "me" in text)
        or ("tell" in text and "profile" in text)
        or "my profile" in text
    )
    if not profile_question:
        return None

    occupation = str(profile.get("occupation") or "not set").replace("_", " ")
    income = profile.get("monthly_income")
    expenses = profile.get("monthly_expenses")
    goals = profile.get("goals") or ([profile["goal"]] if profile.get("goal") else [])
    loans = profile.get("loans") or []
    sips = profile.get("sips") or []
    lines = [
        "Here is what I know from your saved profile:",
        f"- Occupation: {occupation}",
        f"- Monthly income: Rs. {income:,}" if isinstance(income, (int, float)) else "- Monthly income: not set",
        f"- Monthly expenses: Rs. {expenses:,}" if isinstance(expenses, (int, float)) else "- Monthly expenses: not set",
        f"- Goals: {', '.join(str(goal) for goal in goals) if goals else 'none listed'}",
        f"- Loans: {len(loans)} listed",
        f"- Active SIPs: {len(sips)} listed",
        f"- Language: {profile.get('language') or 'english'}",
        f"- Money comfort: {profile.get('money_comfort') or 'not set'}",
    ]
    return "\n".join(lines)

class ChatRequest(BaseModel):
    message: str
    mode: str = "sahayak"
    session_id: str = "default"
    user_id: Optional[str] = "anonymous"
    profile: Optional[dict] = {}


# ──────────────────────────────────────────────────────────────
# CORE CHAT LOGIC – Reusable for Web + WhatsApp
# ──────────────────────────────────────────────────────────────

async def process_chat(req: ChatRequest) -> dict:
    """
    Core chat processing logic – used by both the web endpoint and WhatsApp webhook.
    """
    try:
        profile = dict(req.profile or {})
        if req.user_id and req.user_id != "anonymous":
            from db.mongo import get_collection

            stored = get_collection("users").find_one(
                {"$or": [{"user_id": req.user_id}, {"userId": req.user_id}]},
                {"_id": 0},
            ) or {}
            for key, value in stored.items():
                if key not in profile or profile[key] is None or (isinstance(profile[key], list) and not profile[key]):
                    profile[key] = value
        history = get_recent_messages(req.session_id)

        # Debug: Log incoming profile data
        print(f"[CHAT] Incoming request profile: {profile}")
        print(f"[CHAT] User ID: {req.user_id}")
        print(f"[CHAT] Profile occupation: {profile.get('occupation')}")
        print(f"[CHAT] Profile goals: {profile.get('goals')}")

        # Persistent memory: capture financial facts (income, expenses, goal, EMI) from chat
        emi_info = persist_memory_from_message(req.user_id or "anonymous", req.message)

        # Call Agno Router with full context
        # Add EMI info to dependencies if available
        dependencies = {"profile": profile, "history": history}
        if emi_info and (emi_info.get("current_emi") or emi_info.get("new_emi")):
            dependencies["emi_info"] = emi_info

        demo_reply = _demo_profile_reply(profile, req.message) or _demo_scheme_reply(profile, req.message)
        if demo_reply:
            return {
                "reply": demo_reply,
                "payment": None,
                "agent_trace": {
                    "systems": ["DhanMitra Demo Profile Context"],
                    "internalLoop": [{"turn": 1, "label": "Used stored demo profile context"}],
                },
                "routing": {
                    "agents": ["Scheme_Finder" if _demo_scheme_reply(profile, req.message) else "Sahayak"],
                    "intent": req.message,
                    "language": profile.get("language", "english"),
                },
            }

        # Debug: Log dependencies being passed to agent
        print(f"[CHAT] Dependencies to agent: {list(dependencies.keys())}")
        print(f"[CHAT] Profile in dependencies: {dependencies.get('profile')}")

        # Try to pass profile directly to agent context
        profile_context = json.dumps(profile, ensure_ascii=True, default=str)
        agent_message = (
            f"User message: {req.message}\n\n"
            f"Current user profile (use this directly; do not ask the user to repeat these details): {profile_context}"
        )
        response = await AgentRouter.arun(
            agent_message,
            user_id=req.user_id,
            session_id=req.session_id,
            dependencies=dependencies,
            context={"profile": dependencies.get("profile")}  # Add profile to agent context as well
        )

        # Extract reply
        validated = response.content
        if hasattr(validated, "reply"):
            reply = validated.reply
            risk_flag = getattr(validated, "risk_flag", None)
        else:
            reply = str(validated)
            risk_flag = None

        # Get the agent that handled the request
        delegated_agent = "Sahayak"
        member_responses = getattr(response, "member_responses", None)
        if member_responses:
            first_member = member_responses[0]
            delegated_agent = (
                getattr(first_member, "agent_name", None)
                or getattr(first_member, "agent_id", None)
                or "Sahayak"
            )

        # Build agent trace
        agent_trace = {
            "systems": ["Agno Multi-Agent Router"],
            "internalLoop": [
                {"turn": 1, "label": f"Router delegated to {delegated_agent}"},
                {"turn": 2, "label": "Mitra Insights Engine applied (if applicable)"}
            ]
        }
        if risk_flag:
            agent_trace["risk_flag"] = risk_flag

        # Structured payment payload for in-chat Razorpay checkout cards (Phase 2)
        payload, used_fallback = resolve_payment_payload(
            response, req.message, req.user_id, req.session_id
        )
        if payload:
            payload["session_id"] = req.session_id
            payload["user_id"] = req.user_id or "anonymous"
            if used_fallback:
                reply = f"{reply}\n\nI've prepared a demo checkout for this — tap the card below to complete it."

        return {
            "reply": reply,
            "payment": payload,
            "agent_trace": agent_trace,
            "routing": {
                "agents": [delegated_agent],
                "intent": req.message,
                "language": profile.get("language", "english")
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# WEB CHAT ENDPOINT
# ──────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        # Process the chat
        result = await process_chat(req)

        # Persist to MongoDB
        append_message(req.session_id, req.user_id, req.mode, "user", req.message)
        append_message(req.session_id, req.user_id, req.mode, "assistant", result["reply"])

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# CONVERSATION HISTORY
# ──────────────────────────────────────────────────────────────

@router.get("/chat/history/{session_id}")
async def get_history(session_id: str):
    """Get all messages for a specific session."""
    messages = get_session_messages(session_id)
    return {"session_id": session_id, "messages": messages}


@router.get("/chat/sessions")
async def list_sessions(user_id: str = Query(...)):
    """List recent sessions for a user."""
    sessions = get_user_sessions(user_id)
    return {"sessions": sessions}


# ──────────────────────────────────────────────────────────────
# WHATSAPP WEBHOOK
# ──────────────────────────────────────────────────────────────

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(payload: dict):
    """
    Webhook endpoint for receiving WhatsApp messages.
    Called by the Node.js bridge.
    """
    try:
        from_number = payload.get("from", "")
        message = payload.get("body", "")
        sender_name = payload.get("senderName", "Unknown")

        if not message:
            return {"status": "ignored", "reason": "empty message"}

        # Generate session ID from WhatsApp number
        session_id = f"whatsapp_{from_number.replace('@', '_')}"
        user_id = f"whatsapp_{from_number.replace('@', '_')}"

        # Try to get existing profile from MongoDB
        from db.mongo import get_collection
        users_col = get_collection("users")
        existing_user = users_col.find_one({"user_id": user_id})

        profile = {}
        if existing_user:
            profile = {
                "language": existing_user.get("language", "english"),
                "occupation": existing_user.get("occupation", "other"),
                "money_comfort": existing_user.get("money_comfort", "beginner"),
            }

        # Build chat request
        chat_req = ChatRequest(
            message=message,
            mode="sahayak",
            session_id=session_id,
            user_id=user_id,
            profile=profile
        )

        # Process the chat (reuses the same logic as web)
        response = await process_chat(chat_req)

        # Persist to MongoDB
        append_message(session_id, user_id, "sahayak", "user", message)
        append_message(session_id, user_id, "sahayak", "assistant", response.get("reply", ""))

        # Send reply back via WhatsApp
        await send_whatsapp_reply(from_number, response.get("reply", "Sorry, I couldn't process that."))

        return {
            "status": "success",
            "reply": response.get("reply", ""),
            "from": from_number
        }

    except Exception as e:
        print(f"WhatsApp webhook error: {str(e)}")
        return {"status": "error", "detail": str(e)}


# ──────────────────────────────────────────────────────────────
# WHATSAPP REPLY HELPER
# ──────────────────────────────────────────────────────────────

async def send_whatsapp_reply(to: str, message: str):
    """Helper to send reply via WhatsApp service"""
    try:
        # Truncate long messages (WhatsApp has limits)
        if len(message) > 1600:
            # Split into chunks
            chunks = [message[i:i+1600] for i in range(0, len(message), 1600)]
            for chunk in chunks:
                await whatsapp_service.send_message(to, chunk)
        else:
            await whatsapp_service.send_message(to, message)
    except Exception as e:
        print(f"Failed to send WhatsApp reply: {str(e)}")