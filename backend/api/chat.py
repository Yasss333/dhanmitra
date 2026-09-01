from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from services.memory import get_recent_messages, append_message, get_session_messages, get_user_sessions
from agents.agno_agents import AgentRouter
from services.whatsapp_service import whatsapp_service

router = APIRouter()

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

        return {
            "reply": reply,
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