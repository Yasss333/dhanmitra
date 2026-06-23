from agno.tools import tool
from db.mongo import get_collection
from agents.agno_setup import get_vector_store
import json

@tool
def get_user_profile(user_id: str) -> dict:
    """Fetch the user's full profile from MongoDB using their user_id."""
    if not user_id or user_id == "anonymous":
        return {"occupation": "other", "language": "english", "money_comfort": "beginner"}
    col = get_collection("users")
    doc = col.find_one({"user_id": user_id}, {"_id": 0})
    return doc or {"occupation": "other", "language": "english", "money_comfort": "beginner"}

@tool
def search_schemes(query: str, occupation: str = "other") -> list:
    """
    Search for government schemes using semantic search (RAG) and keyword filter.
    First searches LanceDB for relevant scheme documents, then filters by occupation.
    """
    vector_store = get_vector_store()
    # Semantic search
    results = vector_store.search(query, limit=10)
    
    # Fetch full scheme objects from MongoDB for the matched IDs
    col = get_collection("schemes")
    matched_ids = [r.metadata.get("scheme_id") for r in results if r.meta_data]
    
    # Also query MongoDB directly for occupation match
    db_results = list(col.find(
        {"target_groups": {"$in": [occupation]}},
        {"_id": 0}
    ).limit(5))
    
    # Combine and deduplicate based on scheme_id
    seen = set()
    combined = []
    for s in db_results:
        if s.get('scheme_id') not in seen:
            seen.add(s.get('scheme_id'))
            combined.append(s)
            
    # Add LanceDB results if not already present
    for r in results:
        if r.metadata and r.meta_data.get('scheme_id') not in seen:
            # Fetch full doc from MongoDB
            doc = col.find_one({"scheme_id": r.meta_data['scheme_id']}, {"_id": 0})
            if doc:
                combined.append(doc)
                seen.add(r.metadata['scheme_id'])
    
    return combined[:5]  # Return top 5

@tool
def apply_mitra_insights(draft_reply: str, profile: dict) -> str:
    """
    The Heart of DhanMitra. Enriches a draft reply with rupee comparisons,
    risk flags, and savings impact based on the user's money_comfort level.
    """
    comfort = profile.get("money_comfort", "beginner")
    occupation = profile.get("occupation", "other")
    
    # If user is beginner, keep it simple but still add a tiny insight
    if comfort == "beginner":
        return draft_reply + "\n\n💡 Tip: Even small savings add up over time. Start with ₹100/week."
    
    # Intermediate/Advanced: Add deeper enrichment
    risk_flag = ""
    savings_tip = ""
    
    # Risk flag logic (simplified)
    if "loan" in draft_reply.lower() or "credit" in draft_reply.lower():
        risk_flag = "⚠️ Risk Flag: High-interest loans can trap you. Always check the interest rate and EMI before signing."
    elif "investment" in draft_reply.lower():
        risk_flag = "📈 Risk Flag: All investments carry risk. Never invest in something you don't understand."
    
    # Savings impact logic
    if occupation == "gig_worker":
        savings_tip = "💰 Savings Impact: If you save ₹50 daily, you'll have ₹18,250 in a year – a solid emergency fund."
    elif occupation == "farmer":
        savings_tip = "🌾 Savings Impact: PM-KISAN gives ₹6,000/year. Combine it with crop insurance to protect your income."
    else:
        savings_tip = "💰 Savings Impact: Saving just 10% of your monthly income can create a safety net in 6 months."
    
    enriched = draft_reply
    if risk_flag:
        enriched += f"\n\n{risk_flag}"
    if savings_tip:
        enriched += f"\n\n{savings_tip}"
    
    return enriched