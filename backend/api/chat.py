from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError
from typing import Optional
from services.memory import get_recent_messages, append_message
from agents.master_router import route_message
from agents.guardrails import AgentOutput
from agents import scam_alert_agent, scheme_finder_agent, tracker_agent, gamify_agent
from agents.insights_engine import run_general, enrich

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    mode: str = "sahayak"
    session_id: str = "default"
    user_id: Optional[str] = "anonymous"
    profile: Optional[dict] = {}

SPECIALIST_MAP = {
    "scam_alert": scam_alert_agent,
    "scheme_finder": scheme_finder_agent,
    "tracker": tracker_agent,
    "gamify": gamify_agent,
}

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        profile = req.profile or {}
        history = get_recent_messages(req.session_id)

        # Step 1: Master Router classifies intent (with Pydantic guardrails)
        routing = route_message(req.message, profile)
        agents = routing.get("agents", ["general"])

        # Step 2: Run primary specialist agent
        primary_key = agents[0]
        specialist = SPECIALIST_MAP.get(primary_key)

        if specialist:
            raw_result = specialist.run(
                message=req.message,
                profile=profile,
                history=history,
            )
        else:
            # "general" falls through to run_general
            raw_result = run_general(
                message=req.message,
                profile=profile,
                history=history,
            )

        # Step 3: Validate agent output through Pydantic guardrails
        try:
            validated = AgentOutput(
                reply=raw_result.get("reply", ""),
                agent_trace=raw_result.get("agent_trace", {}),
            )
        except ValidationError:
            validated = AgentOutput(
                reply="I'm having trouble processing that. Could you rephrase?",
                agent_trace={},
            )

        # Step 4: Mitra Insights Engine enriches the reply
        # (runs AFTER specialist — this is the architecture diagram's pipeline flow)
        # Skip enrichment for scam alerts — those need to stay crisp and clear
        if primary_key != "scam_alert":
            enriched_reply = enrich(
                draft_reply=validated.reply,
                profile=profile,
                original_message=req.message,
            )
        else:
            enriched_reply = validated.reply

        # Add enrichment trace if enrichment actually ran
        agent_trace = validated.agent_trace
        if primary_key != "scam_alert":
            existing_systems = agent_trace.get("systems", [])
            if "Mitra Insights Engine" not in existing_systems:
                existing_systems.append("Mitra Insights Engine")
            agent_trace["systems"] = existing_systems
            loops = agent_trace.get("internalLoop", [])
            loops.append({
                "turn": len(loops) + 1,
                "label": "Mitra Insights Engine: adds comparisons, risk flags, savings impact"
            })
            agent_trace["internalLoop"] = loops

        # Step 5: Persist to MongoDB conversation memory
        append_message(req.session_id, req.user_id, req.mode, "user", req.message)
        append_message(req.session_id, req.user_id, req.mode, "assistant", enriched_reply)

        return {
            "reply": enriched_reply,
            "agent_trace": agent_trace,
            "routing": routing,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))