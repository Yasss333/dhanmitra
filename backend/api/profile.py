from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from db.mongo import get_collection
from models.user import LoanEntry
from typing import List, Optional

router = APIRouter()


class ProfileUpsert(BaseModel):
    user_id: str
    language: str = "english"
    occupation: str = "other"
    money_comfort: str = "beginner"
    goal: str = "emergency_fund"
    onboarding_complete: bool = False
    # ── Phase 3 expandable profile ──
    goals: List[str] = []
    savings_goal_amount: Optional[int] = None
    monthly_income: Optional[int] = None
    monthly_expenses: Optional[int] = None
    risk_profile: str = "conservative"
    loans: List[LoanEntry] = []
    notes: str = ""
    accessibility_mode: str = "normal"


@router.post("/profile")
async def upsert_profile(data: ProfileUpsert):
    try:
        col = get_collection("users")
        now = datetime.now(timezone.utc).isoformat()
        payload = data.model_dump()
        payload["loans"] = [loan.model_dump() if hasattr(loan, "model_dump") else loan for loan in data.loans]
        payload["userId"] = data.user_id  # satisfy legacy unique index; also keep user_id
        col.update_one(
            {"user_id": data.user_id},
            {
                "$set": {**payload, "updated_at": now},
                "$setOnInsert": {"created_at": now, "financial_fitness_score": 0},
            },
            upsert=True,
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    try:
        col = get_collection("users")
        doc = col.find_one({"user_id": user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Profile not found")
        return doc
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))