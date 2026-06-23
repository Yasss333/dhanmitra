from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from db.mongo import get_collection

router = APIRouter()

class ProfileUpsert(BaseModel):
    user_id: str
    language: str = "english"
    occupation: str = "other"
    money_comfort: str = "beginner"
    goal: str = "emergency_fund"
    onboarding_complete: bool = False

@router.post("/profile")
async def upsert_profile(data: ProfileUpsert):
    try:
        col = get_collection("users")
        now = datetime.now(timezone.utc).isoformat()
        col.update_one(
            {"user_id": data.user_id},
            {
                "$set": {**data.model_dump(), "updated_at": now},
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