"""Vapi voice endpoint.
Vapi handles STT + TTS; this endpoint is the LLM brain.
It receives the transcribed user message, runs process_chat,
and returns plain text for Vapi to speak back.

Flow:
  User speaks → Vapi STT → POST /api/voice → process_chat → reply text → Vapi TTS → user hears it
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
from api.chat import process_chat, ChatRequest
from services.payment_payloads import _callable
from agents.agno_tools import create_razorpay_order, start_sip

router = APIRouter()

_create_order_fn = _callable(create_razorpay_order)
_start_sip_fn = _callable(start_sip)


class VapiMessage(BaseModel):
    role: str
    content: Optional[str] = None


class VapiVoiceRequest(BaseModel):
    messages: List[VapiMessage] = []
    user_id: Optional[str] = "voice-user"
    session_id: Optional[str] = "default"
    call_id: Optional[str] = None


@router.post("/voice")
async def voice(req: VapiVoiceRequest):
    """Thin wrapper: Vapi sends transcribed text, we return text to speak."""
    try:
        last_user_msg = ""
        for msg in reversed(req.messages):
            if msg.role == "user" and msg.content:
                last_user_msg = msg.content
                break

        if not last_user_msg.strip():
            return {"content": "Sorry, I didn't catch that. Could you repeat?"}

        session_id = req.session_id or f"voice-{req.call_id or 'default'}"

        chat_req = ChatRequest(
            message=last_user_msg,
            mode="sahayak",
            session_id=session_id,
            user_id=req.user_id or "voice-user",
            profile={},
        )
        result = await process_chat(chat_req)

        reply = result.get("reply", "Sorry, I couldn't process that.")

        # If a payment was created, append a spoken link so the user can pay
        payment = result.get("payment")
        if payment and payment.get("order_id"):
            amount = payment.get("amount", "")
            purpose = payment.get("purpose", "payment")
            order_id = payment["order_id"]
            kind = payment.get("kind", "one_time")
            freq = payment.get("frequency", "")

            if kind == "sip":
                reply += (
                    f" I've also set up a {freq} SIP of ₹{amount} for {purpose}."
                    f" Open the DhanMitra app to complete the first payment."
                )
            else:
                reply += (
                    f" I've created a payment of ₹{amount} for {purpose}."
                    f" Open the DhanMitra app to complete it."
                )

        # Vapi expects exactly this shape
        return {"content": reply}

    except Exception as e:
        # Never let Vapi see a 500 — it needs valid JSON with "content"
        print(f"[VAPI ERROR] {e}")
        return {"content": "Sorry, something went wrong on my end. Please try again in a moment."}
