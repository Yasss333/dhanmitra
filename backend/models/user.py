from pydantic import BaseModel
from typing import Optional

class UserProfile(BaseModel):
    user_id: str
    language: str = "english"
    occupation: str = "other"
    money_comfort: str = "beginner"
    goal: str = "emergency_fund"
    onboarding_complete: bool = False
    financial_fitness_score: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None