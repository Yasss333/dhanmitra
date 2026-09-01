import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from db.mongo import get_collection
from models.payment import PaymentRequest
from services.setu_service import setu_service

router = APIRouter(prefix="/payments", tags=["payments"])


class SandboxCreditRequest(BaseModel):
    transaction_id: str
    amount: int = Field(gt=0)
    upi_id: str
    payer_vpa: str = "sandbox.customer@upi"


@router.post("")
async def create_payment(req: PaymentRequest):
    result = await setu_service.create_payment_link(amount=req.amount, purpose=req.purpose)
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Setu could not create a payment link."))
    record = {**result, "user_id": req.user_id, "session_id": req.session_id, "created_at": datetime.now(timezone.utc).isoformat()}
    get_collection("payments").update_one({"transaction_id": result["transaction_id"]}, {"$set": record}, upsert=True)
    return {"success": True, "data": result}


@router.get("/{transaction_id}")
async def get_payment_status(transaction_id: str):
    result = await setu_service.get_payment_status(transaction_id)
    if result.get("success"):
        return {"success": True, "data": result["payment_details"]}
    local = get_collection("payments").find_one({"transaction_id": transaction_id}, {"_id": 0})
    if local:
        return {"success": True, "data": local}
    raise HTTPException(status_code=404, detail="Payment not found")


@router.post("/sandbox/credit")
async def add_sandbox_credit(req: SandboxCreditRequest):
    result = await setu_service.add_sandbox_credit(**req.model_dump())
    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result["error"])
    get_collection("payments").update_one({"transaction_id": req.transaction_id}, {"$set": {"status": "PAYMENT_SUBMITTED", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "message": "Sandbox credit submitted. Setu will send the configured notification."}


@router.post("/webhook/setu")
@router.post("/webhook/setu/notifications")
async def setu_webhook(request: Request):
    """Set this URL's parent in Bridge; Setu appends /notifications itself."""
    try:
        payload = json.loads(await request.body())
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid webhook JSON")
    events = payload.get("events") or []
    event = events[0].get("data", {}) if events and isinstance(events[0], dict) else payload
    transaction_id = event.get("platformBillID") or event.get("transactionReference") or event.get("billerBillID")
    status = event.get("status") or event.get("eventType") or "PAYMENT_RECEIVED"
    if transaction_id:
        get_collection("payments").update_one({"transaction_id": transaction_id}, {"$set": {"status": status, "setu_event": event, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "ok"}
