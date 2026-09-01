from pydantic import BaseModel
from typing import Optional, List


class UserInsights(BaseModel):
    user_id: str
    monthly_income: Optional[float] = None
    monthly_emi: Optional[float] = None
    goals: List[str] = []
    savings_rate: Optional[float] = None
    risk_tolerance: Optional[str] = None
    updated_at: Optional[str] = None
