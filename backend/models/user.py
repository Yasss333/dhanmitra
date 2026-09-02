from pydantic import BaseModel, Field
from typing import Optional, List


class LoanEntry(BaseModel):
    type: str = "personal"  # home / personal / education / vehicle / credit_card / other
    lender: str = ""
    emi: Optional[int] = None
    outstanding: Optional[int] = None


class UserProfile(BaseModel):
    user_id: str
    language: str = "english"
    occupation: str = "other"
    money_comfort: str = "beginner"
    goal: str = "emergency_fund"
    onboarding_complete: bool = False
    financial_fitness_score: int = 0
    # ── Phase 3 expandable profile ──
    goals: List[str] = Field(default_factory=list)
    savings_goal_amount: Optional[int] = None
    monthly_income: Optional[int] = None
    monthly_expenses: Optional[int] = None
    risk_profile: str = "conservative"  # conservative / balanced / aggressive
    loans: List[LoanEntry] = Field(default_factory=list)
    notes: str = ""
    accessibility_mode: str = "normal"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None