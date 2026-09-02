from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config.settings import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from services.razorpay_service import create_order, mark_paid, verify_signature

router = APIRouter(prefix="/razorpay", tags=["razorpay"])

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing from environment")


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
async def create_order_endpoint(req: CreateOrderRequest):
    """Create a Razorpay order. Amount is in paise (₹1 = 100 paise)."""
    try:
        return await _create_order(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")


async def _create_order(req: CreateOrderRequest):
    order = create_order(req.amount, req.purpose, req.user_id, req.session_id)
    return {"order_id": order["order_id"], "amount": order["amount"], "currency": order["currency"]}


@router.post("/verify-payment")
async def verify_payment_endpoint(req: VerifyPaymentRequest):
    """Verify Razorpay payment signature (HMAC-SHA256)."""
    if not all([req.razorpay_payment_id, req.razorpay_order_id, req.razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields")

    if not verify_signature(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed. Do NOT mark as paid.")

    # Signature valid → mark paid
    mark_paid(req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature)

    return {"success": True, "message": "Payment verified successfully", "razorpay_payment_id": req.razorpay_payment_id}