import os
import re
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agno.agent import Agent
from agno.models.openai import OpenAIChat

app = FastAPI(title="DhanMitra Core Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. STRUCTURAL DATA SCHEMAS (Type Safety)
# ==========================================
class UserProfile(BaseModel):
    language: str
    occupation: str  # e.g., Farmer, Gig-Worker
    money_comfort: str  # Beginner, Intermediate, Advanced

class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: str
    profile: UserProfile

class InsightsPayload(BaseModel):
    extracted_income: Optional[float] = None
    extracted_debts: Optional[float] = None
    detected_risk_flags: List[str] = Field(default_factory=list)
    actionable_tip: str

# ==========================================
# 2. CORE INFERENCE WORKERS
# ==========================================

# Specialized Worker A: The Fraud Shield
guardian_agent = Agent(
    name="Guardian",
    model=OpenAIChat(id="gpt-4o"),
    system_prompt=(
        "You are Guardian, the Cyber Security Shield of DhanMitra. "
        "The user is likely facing a financial scam, fake lottery, or pressure to share an OTP. "
        "Provide a crisp, urgent, protective response in simple terms. Do not use jargon."
    )
)

# Specialized Worker B: Scheme Finder
yojana_agent = Agent(
    name="Yojana Setu",
    model=OpenAIChat(id="gpt-4o"),
    system_prompt=(
        "You are Yojana Setu. Your job is to match users to government welfare schemes "
        "(like PM-KISAN or PM Shram Yogi Maan-dhan). Inform them that all government "
        "registrations are completely free. Never ask for payments."
    )
)

# ==========================================
# 3. MITRA INSIGHTS INTERCEPTOR ENGINE
# ==========================================
def execute_mitra_insights(message: str, profile: UserProfile) -> InsightsPayload:
    """
    Executes raw extraction and risk analysis natively without heavy external dependency pipelines.
    """
    # Active Extraction via basic multi-pattern scanning
    income_match = re.search(r'(?:salary|kamai|income|income is)\s*(?:rs\.?|inr|₹)?\s*(\d+k?|\d+)', message, re.IGNORECASE)
    detected_income = None
    if income_match:
        val = income_match.group(1).lower()
        detected_income = float(val.replace('k', '000')) if 'k' in val else float(val)

    # Adaptive Enrichment Generation
    flags = []
    if "loan" in message.lower() or "emi" in message.lower():
        flags.append("HIGH_DEBT_ALERT: Verifying terms to avoid predatory loan apps.")
    
    if profile.money_comfort == "Beginner":
        tip = "Tip from DhanMitra: Try to set aside just ₹50 every single week in a safe bank account."
    else:
        tip = "Strategy: Maintain an emergency pool equal to 3 months of your primary operating expenses."

    return InsightsPayload(
        extracted_income=detected_income,
        detected_risk_flags=flags,
        actionable_tip=tip
    )

# ==========================================
# 4. EXPLICIT SECURITY GUARDRAIL LAYER
# ==========================================
def apply_strict_output_guardrails(text: str) -> str:
    """
    Ensures absolute data safety. Redacts any accidental generation of highly sensitive identifiers.
    """
    # Look for common 12-digit patterns or keyword associations
    cleaned = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', "[Identifier Omitted for Safety]", text)
    
    # Keyword protection cleanup
    for keyword in ["Aadhaar", "Aadhar", "UPI PIN", "Password"]:
        if keyword in cleaned:
            cleaned = cleaned.replace(keyword, f"[Protected Context]")
            
    return cleaned

# ==========================================
# 5. UNIFIED ORCHESTRATION PIPELINE
# ==========================================
@app.post("/api/chat")
async def handle_dhanmitra_orchestration(payload: ChatRequest):
    try:
        user_msg = payload.message
        
        # Step 1: Pre-execution Risk Processing (Mitra Insights)
        insights = execute_mitra_insights(user_msg, payload.profile)
        
        # Step 2: Intent Routing Selection Logic
        # Quick check for security or emergency phrases to bypass slow routing chains
        security_triggers = ["scam", "otp", "fraud", "police", "fake", "lottery"]
        if any(trigger in user_msg.lower() for trigger in security_triggers):
            agent_response = guardian_agent.run(user_msg)
            selected_agent = "Guardian (Scam Shield)"
        else:
            # Fallback to standard workflow routing
            agent_response = yojana_agent.run(
                f"User Profile: {payload.profile.dict()}. Message: {user_msg}"
            )
            selected_agent = "Yojana Setu (Schemes)"
            
        # Step 3: Sanitize the output before sending
        final_clean_text = apply_strict_output_guardrails(agent_response.content)
        
        # Step 4: Return Unified Package to Frontend
        return {
            "session_id": payload.session_id,
            "active_routing_trace": selected_agent,
            "insights": insights.dict(),
            "message": final_clean_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)