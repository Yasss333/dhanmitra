"""Shared Razorpay client for order creation and signature verification.
Credentials never reach the browser; KEY_SECRET stays server-side.
"""
import hashlib
import hmac
from datetime import datetime, timezone

import razorpay

from config.settings import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from db.mongo import get_collection

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing from environment")


_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
_client.set_app_details({"title": "DhanMitra", "version": "1.0.0"})


def get_client():
    return _client


def create_order(amount_paise: int, purpose: str, user_id: str, session_id: str) -> dict:
    """Create a Razorpay order. amount is in paise (minimum 100)."""
    if amount_paise < 100:
        raise ValueError("Minimum order amount is ₹1 (100 paise)")
    receipt = f"DM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{str(user_id)[:8]}-{datetime.now(timezone.utc).microsecond}"
    order = _client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": {"purpose": purpose, "session_id": session_id, "user_id": user_id},
        }
    )
    get_collection("payments").update_one(
        {"order_id": order["id"]},
        {
            "$set": {
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": "INR",
                "receipt": receipt,
                "purpose": purpose,
                "user_id": user_id,
                "session_id": session_id,
                "gateway": "razorpay",
                "status": "CREATED",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "amount_paise": int(order["amount"]),
        "currency": order["currency"],
    }


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """RFC2104-style HMAC-SHA256 signature comparison."""
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def mark_paid(order_id: str, payment_id: str, signature: str) -> None:
    get_collection("payments").update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "PAID",
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=False,
    )