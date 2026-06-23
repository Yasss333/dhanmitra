from pydantic import BaseModel, field_validator
from typing import List

class RouterOutput(BaseModel):
    agents: List[str]
    intent: str
    language: str

    @field_validator("agents")
    @classmethod
    def validate_agents(cls, v):
        allowed = {"scam_alert", "scheme_finder", "tracker", "gamify", "general"}
        return [a if a in allowed else "general" for a in v] or ["general"]

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        allowed = {"hindi", "marathi", "kannada", "english"}
        return v if v in allowed else "english" 

class AgentOutput(BaseModel):
    reply: str
    agent_trace: dict = {}

    @field_validator("reply")
    @classmethod
    def reply_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Agent returned empty reply")
        return v.strip()