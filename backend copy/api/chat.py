from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.memory import get_recent_messages, append_message
from agents.agno_agents import AgentRouter

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    mode: str = "sahayak"
    session_id: str = "default"
    user_id: Optional[str] = "anonymous"
    profile: Optional[dict] = {}

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        profile = req.profile or {}
        history = get_recent_messages(req.session_id)

        response = await AgentRouter.arun(
            req.message,
            user_id=req.user_id,
            session_id=req.session_id,
            dependencies={"profile": profile, "history": history},
        )

        validated = response.content
        if hasattr(validated, "reply"):
            reply = validated.reply
            risk_flag = getattr(validated, "risk_flag", None)
        else:
            reply = str(validated)
            risk_flag = None

        delegated_agent = "Sahayak"
        member_responses = getattr(response, "member_responses", None)
        if member_responses:
            first_member = member_responses[0]
            delegated_agent = (
                getattr(first_member, "agent_name", None)
                or getattr(first_member, "agent_id", None)
                or "Sahayak"
            )

        agent_trace = {
            "systems": ["Agno Multi-Agent Router"],
            "internalLoop": [
                {"turn": 1, "label": f"Router delegated to {delegated_agent}"},
                {"turn": 2, "label": "Mitra Insights Engine applied (if applicable)"}
            ]
        }
        if risk_flag:
            agent_trace["risk_flag"] = risk_flag

        append_message(req.session_id, req.user_id, req.mode, "user", req.message)
        append_message(req.session_id, req.user_id, req.mode, "assistant", reply)

        return {
            "reply": reply,
            "agent_trace": agent_trace,
            "routing": {"agents": [delegated_agent], "intent": req.message, "language": "english"}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))