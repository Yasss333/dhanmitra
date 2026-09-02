from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import re
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

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        # users collection has a legacy unique index on userId; set both to avoid null collisions
        col.update_one(
            {"user_id": user_id},
            {"$set": {**updates, "userId": user_id, "user_id": user_id}},
            upsert=True,
        )
        print(f"[MEMORY] Persisted for {user_id}: {list(updates.keys())}")

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
        profile = req.profile or {}
        history = get_recent_messages(req.session_id)

        # Persistent memory: capture financial facts (income, expenses, goal) from chat
        persist_memory_from_message(req.user_id or "anonymous", req.message)

        # Call Agno Router with full context
        response = await AgentRouter.arun(
            req.message,
            user_id=req.user_id,
            session_id=req.session_id,
            dependencies={"profile": profile, "history": history},
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