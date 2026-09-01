import hashlib
import hmac
from datetime import datetime, timezone

import razorpay
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config.settings import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from db.mongo import get_collection

router = APIRouter(prefix="/razorpay", tags=["razorpay"])

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing from environment")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
client.set_app_details({"title": "DhanMitra", "version": "1.0.0"})


class CreateOrderRequest(BaseModel):
    amount: int = Field(ge=100, description="Amount in paise (minimum 100)")
    purpose: str = "DhanMitra payment"
    user_id: str = "anonymous"
    session_id: str = "default"


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    session_id: str = "default"
    user_id: str = "anonymous"


@router.post("/create-order")
async def create_order(req: CreateOrderRequest):
    """Create a Razorpay order. Amount is in paise (₹1 = 100 paise)."""
    receipt = f"DM-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{req.user_id[:8]}"
    try:
        order = client.order.create(
            {
                "amount": req.amount,
                "currency": "INR",
                "receipt": receipt,
                "notes": {"purpose": req.purpose, "session_id": req.session_id, "user_id": req.user_id},
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")

    # Persist locally
    record = {
        "order_id": order["id"],
        "amount": req.amount,
        "currency": "INR",
        "receipt": receipt,
        "purpose": req.purpose,
        "user_id": req.user_id,
        "session_id": req.session_id,
        "gateway": "razorpay",
        "status": "CREATED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    get_collection("payments").update_one({"order_id": order["id"]}, {"$set": record}, upsert=True)

    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"]}


@router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest):
    """Verify Razorpay payment signature (HMAC-SHA256)."""
    if not all([req.razorpay_payment_id, req.razorpay_order_id, req.razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields")

    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed. Do NOT mark as paid.")

    # Signature valid → mark paid
    get_collection("payments").update_one(
        {"order_id": req.razorpay_order_id},
        {
            "$set": {
                "status": "PAID",
                "razorpay_payment_id": req.razorpay_payment_id,
                "razorpay_signature": req.razorpay_signature,
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=False,
    )

    return {"success": True, "message": "Payment verified successfully", "razorpay_payment_id": req.razorpay_payment_id}