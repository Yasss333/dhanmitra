from agno.tools import tool
from db.mongo import get_collection
from agents.agno_setup import get_vector_store
import json
import yfinance as yf
from services.setu_service import setu_service
from datetime import datetime, timezone

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
    matched_ids = [r.meta_data.get("scheme_id") for r in results if r.meta_data]
    
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
        if r.meta_data and r.meta_data.get('scheme_id') not in seen:
            # Fetch full doc from MongoDB
            doc = col.find_one({"scheme_id": r.meta_data['scheme_id']}, {"_id": 0})
            if doc:
                combined.append(doc)
                seen.add(r.meta_data['scheme_id'])
    
    return combined[:5]  # Return top 5

@tool
def get_stock_price(ticker: str) -> dict:
    """
    Fetches real-time stock data for a given ticker symbol using Yahoo Finance.
    Returns price, change, volume, and a disclaimer.
    """
    try:
        # Clean the ticker input (remove $, spaces, convert to uppercase)
        ticker = ticker.strip().upper().replace('$', '')
        
        # Fetch stock data
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Get current price (prefer 'currentPrice' or 'regularMarketPrice')
        price = info.get('currentPrice') or info.get('regularMarketPrice')
        
        if price is None:
            return {
                "error": f"Could not find price for {ticker}. Please check the ticker symbol.",
                "ticker": ticker
            }
        
        # Get additional data
        previous_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
        change = price - previous_close if previous_close else None
        change_percent = (change / previous_close * 100) if previous_close and change else None
        volume = info.get('volume') or info.get('regularMarketVolume')
        
        # Get company name
        name = info.get('longName') or info.get('shortName') or ticker
        
        # Build the response
        result = {
            "ticker": ticker,
            "name": name,
            "price": round(price, 2),
            "currency": info.get('currency', 'USD'),
            "change": round(change, 2) if change else None,
            "change_percent": round(change_percent, 2) if change_percent else None,
            "volume": volume,
            "market_cap": info.get('marketCap'),
            "pe_ratio": info.get('forwardPE') or info.get('trailingPE'),
            "day_high": info.get('dayHigh'),
            "day_low": info.get('dayLow'),
            "disclaimer": "Past performance does not guarantee future returns. This is for educational purposes only."
        }
        
        return result
        
    except Exception as e:
        return {
            "error": f"Error fetching stock data for {ticker}: {str(e)}",
            "ticker": ticker
        }



@tool
async def create_upi_payment_request(amount: int, purpose: str, user_id: str, session_id: str) -> dict:
    """
    Create a UPI payment request using Setu.
    This tool is called by the agent when a user wants to save money or make a payment.
    
    Args:
        amount: Amount in rupees (e.g., 500 for ₹500)
        purpose: Description of what the payment is for
        user_id: The user's ID
        session_id: The current chat session ID
    """
    
    try:
        # Validate amount
        if amount <= 0:
            return {
                "success": False,
                "error": "Amount must be greater than 0"
            }
        
        # Check for reasonable limits (demo)
        if amount > 100000:  # ₹1 Lakh limit for demo
            return {
                "success": False,
                "error": "Amount exceeds demo limit of ₹1,00,000"
            }
        
        # Create the payment request
        result = await setu_service.create_payment_link(
            amount=amount,
            purpose=purpose,
            customer_phone="9999999999",  # You can pass user's phone if available
            expires_in_minutes=30
        )
        
        # Save the transaction to MongoDB for tracking
        from db.mongo import get_collection
        payments_col = get_collection("payments")
        
        if result.get("success"):
            payments_col.insert_one({
                "transaction_id": result["transaction_id"],
                "user_id": user_id,
                "session_id": session_id,
                "amount": result["amount"],
                "purpose": result["purpose"],
                "status": "created",
                "payment_link": result["payment_link"],
                "qr_code": result["qr_code"],
                "upi_deeplink": result["upi_deeplink"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": result["expires_at"].isoformat() if result.get("expires_at") else None
            })
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create payment request: {str(e)}"
        }

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