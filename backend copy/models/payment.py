from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentRequest(BaseModel):
    amount: int
    purpose: str
    customer_vpa: Optional[str] = None
    customer_phone: Optional[str] = None
    session_id: str
    user_id: str

class PaymentResponse(BaseModel):
    transaction_id: str
    payment_link: str
    qr_code: Optional[str] = None
    upi_deeplink: Optional[str] = None
    amount: int
    purpose: str
    status: str
    expires_at: datetime

class PaymentStatus(BaseModel):
    transaction_id: str
    status: str  # created, pending, success, failed, expired
    amount: int
    purpose: str
    customer_vpa: Optional[str] = None
    paid_at: Optional[datetime] = None
    error_message: Optional[str] = None