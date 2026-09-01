from pydantic import BaseModel
from typing import List, Optional

class GovernmentScheme(BaseModel):
    scheme_id: str
    name: str
    description: str
    eligibility: List[str]
    benefits: str
    apply_url: Optional[str] = None
    target_groups: List[str] = []   # ["farmer", "gig_worker", "student", "women"]
    category: str = "general"       # "agriculture", "insurance", "credit", "education"