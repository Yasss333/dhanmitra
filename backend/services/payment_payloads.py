"""Extract structured payment payloads from agent tool calls (or a regex fallback)
so the frontend can render a Razorpay checkout card inside the chat.
"""
import ast
import json
import re
from typing import Any, Optional, Tuple

from agents.agno_tools import create_razorpay_order, start_sip

PAYMENT_TOOLS = {"create_razorpay_order", "start_sip"}


def _callable(tool_obj):
    """@tool returns an agno Function object; use its wrapped entrypoint when present."""
    entrypoint = getattr(tool_obj, "entrypoint", None)
    return entrypoint if callable(entrypoint) else tool_obj


_create_order_fn = _callable(create_razorpay_order)
_start_sip_fn = _callable(start_sip)

_AMOUNT_RE = re.compile(
    r"\b(?:₹|rs\.?|rupees?|inr)\s*([0-9][0-9,]*)\b"  # ₹500 / rs 500 / rupees 500
    r"|\b([0-9][0-9,]*)\s*(?:₹|rs\.?|rupees?|inr)\b"  # 500 rupees / 1200 rs
    r"|\b(?:save|invest|deposit|sip|topup|topp?up|pay)[^\d]{0,12}([0-9][0-9,]*)\b",  # save 5000 / invest 1,000
    re.IGNORECASE,
)
_SIP_RE = re.compile(r"\bsip\b|\brecurring\b|\bevery\s+(?:week|month|quarter|year)\b", re.IGNORECASE)
_SAVE_RE = re.compile(r"\bsave\b|\binvest\b|\bpay\b|\btopp?up\b|\bdeposit\b", re.IGNORECASE)
_FREQ_RE = re.compile(r"\b(weekly|monthly|quarterly|yearly|every\s+(?:week|month|quarter|year))\b", re.IGNORECASE)
_NOISE_RE = re.compile(
    r"\b(user|me|i|want to|wanna|need to|please|can you|help me|i want|my)\b",
    re.IGNORECASE,
)


def _coerce_args(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _coerce_result(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass
        try:
            parsed = ast.literal_eval(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass
    return {}
    return {}


def _tool_events(response):
    for member in getattr(response, "member_responses", None) or []:
        for msg in getattr(member, "messages", None) or []:
            tool_name = getattr(msg, "tool_name", None)
            if not tool_name or tool_name not in PAYMENT_TOOLS:
                continue
            args = _coerce_args(getattr(msg, "tool_args", None))
            content = ""
            if hasattr(msg, "get_content_string"):
                content = msg.get_content_string()
            elif msg.content is not None:
                content = str(msg.content)
            yield tool_name, args, content


def extract_payment_payload(response) -> Optional[dict]:
    """Look for our Razorpay tool calls inside the agent run and build a card payload."""
    for tool_name, args, raw_result in _tool_events(response):
        result = _coerce_result(raw_result)
        if result.get("success") is False:
            continue
        base = {
            "type": "payment",
            "gateway": "razorpay",
            "kind": "one_time",
            "order_id": result.get("order_id") or args.get("order_id"),
            "amount": result.get("amount") or args.get("amount"),
            "purpose": result.get("purpose") or args.get("purpose"),
        }
        if tool_name == "start_sip":
            base.update(
                {
                    "kind": "sip",
                    "plan_id": result.get("plan_id") or args.get("plan_id"),
                    "frequency": result.get("frequency") or args.get("frequency"),
                    "next_date": result.get("next_date"),
                }
            )
        if base.get("order_id") and base.get("amount"):
            return base
    return None


def _extract_purpose(message: str, amount_token: str) -> str:
    cleaned = _NOISE_RE.sub(" ", message)
    cleaned = cleaned.replace(amount_token, " ")
    cleaned = re.sub(r"\b(?:₹|rs\.?|rupees?|inr)\s*", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .:;")
    if not cleaned:
        return "Savings"
    words = [w for w in re.split(r"\W+", cleaned) if w]
    text = " ".join(words[:6])
    return (text[:50] + "...") if len(text) > 50 else (text or "Savings")


def fallback_payment_payload(message, user_id, session_id) -> Optional[dict]:
    """Regex-based fallback so the demo works even if the model skips tools."""
    if not message:
        return None
    match = _AMOUNT_RE.search(message)
    if not match:
        return None
    raw_amount = next((g for g in match.groups() if g), None)
    if not raw_amount:
        return None
    try:
        amount = int(raw_amount.replace(",", ""))
    except ValueError:
        return None
    if amount <= 0 or amount > 100000:
        return None

    text = message
    purpose = _extract_purpose(text, match.group(0))
    freq_match = _FREQ_RE.search(text)
    is_sip = bool(_SIP_RE.search(text)) or bool(freq_match)

    try:
        if is_sip:
            frequency = (freq_match.group(1) if freq_match else "monthly").lower()
            if "every week" in text:
                frequency = "weekly"
            elif "every month" in text:
                frequency = "monthly"
            elif "every quarter" in text:
                frequency = "quarterly"
            elif "every year" in text:
                frequency = "yearly"
            result = _start_sip_fn(amount, frequency, purpose, user_id or "anonymous", session_id or "default")
        elif _SAVE_RE.search(text):
            result = _create_order_fn(amount, purpose, user_id or "anonymous", session_id or "default")
        else:
            return None
    except Exception:
        return None

    if not result or not result.get("success"):
        return None

    payload = {
        "type": "payment",
        "gateway": "razorpay",
        "order_id": result.get("order_id"),
        "amount": result.get("amount", amount),
        "purpose": result.get("purpose", purpose),
    }
    if result.get("kind") == "sip":
        payload.update(
            {
                "kind": "sip",
                "plan_id": result.get("plan_id"),
                "frequency": result.get("frequency"),
                "next_date": result.get("next_date"),
            }
        )
    else:
        payload["kind"] = "one_time"
    return payload


def resolve_payment_payload(response, message, user_id, session_id) -> Tuple[Optional[dict], Optional[bool]]:
    """Priority: agent tool payload, then regex fallback. Returns (payload, used_fallback)."""
    payload = extract_payment_payload(response)
    if payload:
        return payload, False
    payload = fallback_payment_payload(message, user_id, session_id)
    if payload:
        return payload, True
    return None, None