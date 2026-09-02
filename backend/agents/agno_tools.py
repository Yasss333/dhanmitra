from agno.tools import tool
from db.mongo import get_collection
from agents.agno_setup import get_vector_store
import json
import uuid
import yfinance as yf
from services.setu_service import setu_service
from services.razorpay_service import create_order as razorpay_create_order
from datetime import datetime, timezone, timedelta

@tool
def get_user_profile(user_id: str) -> dict:
    """Fetch the user's full profile from MongoDB using their user_id."""
    if not user_id or user_id == "anonymous":
        return {"occupation": "other", "language": "english", "money_comfort": "beginner"}
    col = get_collection("users")
    doc = col.find_one({"user_id": user_id}, {"_id": 0})
    return doc or {"occupation": "other", "language": "english", "money_comfort": "beginner"}


@tool
def update_user_memory(
    user_id: str,
    monthly_income: int = None,
    monthly_expenses: int = None,
    savings_goal_amount: int = None,
    goal: str = None,
    notes: str = None,
    goals: list[str] = None,
) -> dict:
    """
    THE PERSISTENT MEMORY TOOL. Call this whenever the user tells you something about
    their money that should be remembered and shown in their profile:
      - their monthly salary / income  -> monthly_income (rupees)
      - their monthly expenses / rent  -> monthly_expenses (rupees)
      - a savings goal amount           -> savings_goal_amount (rupees)
      - a named goal (e.g. 'emergency fund', 'new house') -> goal (single) or goals (list)
      - any key financial note          -> notes
    Only pass the fields the user actually mentioned. Returns the updated profile fields.
    """
    if not user_id or user_id == "anonymous":
        return {"success": False, "error": "No user_id provided to persist memory."}

    from datetime import datetime
    col = get_collection("users")
    existing = col.find_one({"user_id": user_id})
    existing = existing or {}

    updates = {}
    if monthly_income is not None:
        updates["monthly_income"] = int(monthly_income)
    if monthly_expenses is not None:
        updates["monthly_expenses"] = int(monthly_expenses)
    if savings_goal_amount is not None:
        updates["savings_goal_amount"] = int(savings_goal_amount)
    if goal:
        # Promote the single named goal into the goals list (dedupe, keep newest)
        new_goal = str(goal).strip()
        if new_goal:
            current_goals = list(existing.get("goals") or [])
            if new_goal not in current_goals:
                current_goals.append(new_goal)
            updates["goals"] = current_goals
    if goals:
        current_goals = list(existing.get("goals") or [])
        for g in goals:
            g = str(g).strip()
            if g and g not in current_goals:
                current_goals.append(g)
        updates["goals"] = current_goals
    if notes:
        current_notes = existing.get("notes") or ""
        sep = "\n" if current_notes else ""
        updates["notes"] = current_notes + sep + str(notes).strip()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    if updates:
        # users collection has a legacy unique index on userId; setting both identifiers
        # avoids creating userId=null docs that collide under that index.
        col.update_one(
            {"user_id": user_id},
            {"$set": {**updates, "userId": user_id, "user_id": user_id}},
            upsert=True,
        )

    return {"success": True, "updated": {k: v for k, v in updates.items() if k != "updated_at"}}

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


FREQUENCY_DAYS = {"weekly": 7, "monthly": 30, "quarterly": 92, "yearly": 365}


@tool
def create_razorpay_order(amount: int, purpose: str, user_id: str, session_id: str) -> dict:
    """
    Create a one-time Razorpay sandbox order (test mode, no real money).
    Called by the agent when the user wants to save, pay, top-up, or invest a specific amount.

    Args:
        amount: Amount in rupees (e.g., 500 for ₹500; minimum ₹1)
        purpose: Description of what the payment is for
        user_id: The user's ID
        session_id: The current chat session ID
    """
    try:
        if amount <= 0:
            return {"success": False, "error": "Amount must be greater than 0"}
        if amount > 100000:
            return {"success": False, "error": "Amount exceeds demo limit of ₹1,00,000"}

        order = razorpay_create_order(amount * 100, purpose, user_id or "anonymous", session_id or "default")

        return {
            "success": True,
            "gateway": "razorpay",
            "kind": "one_time",
            "order_id": order["order_id"],
            "amount": amount,
            "amount_paise": order["amount_paise"],
            "currency": order["currency"],
            "purpose": purpose,
            "message": f"A payment request for ₹{amount} has been created ({purpose}).",
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to create order: {str(e)}"}


@tool
def start_sip(amount: int, frequency: str, purpose: str, user_id: str, session_id: str) -> dict:
    """
    Record a recurring SIP (Systematic Investment Plan) and create the FIRST installment
    as a Razorpay sandbox order. Used when the user wants to invest or save periodically
    (weekly / monthly / quarterly / yearly).

    Args:
        amount: Amount per installment in rupees
        frequency: One of weekly, monthly, quarterly, yearly
        purpose: What the SIP is for (e.g., 'Mutual Fund - ELSS')
        user_id: The user's ID
        session_id: The current chat session ID
    """
    try:
        if amount <= 0:
            return {"success": False, "error": "Amount must be greater than 0"}
        if amount > 100000:
            return {"success": False, "error": "Amount exceeds demo limit of ₹1,00,000"}
        normalized_frequency = (frequency or "monthly").strip().lower()
        if normalized_frequency not in FREQUENCY_DAYS:
            return {"success": False, "error": f"Frequency must be one of {list(FREQUENCY_DAYS.keys())}"}

        plan_id = f"sip-{uuid.uuid4().hex[:8]}"
        next_date = datetime.now(timezone.utc) + timedelta(days=FREQUENCY_DAYS[normalized_frequency])

        get_collection("sip_plans").update_one(
            {"plan_id": plan_id},
            {
                "$set": {
                    "plan_id": plan_id,
                    "user_id": user_id or "anonymous",
                    "session_id": session_id or "default",
                    "amount": amount,
                    "frequency": normalized_frequency,
                    "purpose": purpose,
                    "status": "active",
                    "next_date": next_date.isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )

        # Also link the SIP into the user's profile so it appears in their profile section
        if user_id and user_id != "anonymous":
            sip_entry = {
                "plan_id": plan_id,
                "amount": amount,
                "frequency": normalized_frequency,
                "purpose": purpose,
                "status": "active",
                "next_date": next_date.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            get_collection("users").update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "userId": user_id,
                        "user_id": user_id,
                    },
                    "$push": {"sips": sip_entry},
                },
                upsert=True,
            )

        # First installment = a real test-mode Razorpay order
        first_order = razorpay_create_order(amount * 100, f"{purpose} (first installment)", user_id or "anonymous", session_id or "default")

        return {
            "success": True,
            "gateway": "razorpay",
            "kind": "sip",
            "plan_id": plan_id,
            "amount": amount,
            "frequency": normalized_frequency,
            "purpose": purpose,
            "order_id": first_order["order_id"],
            "amount_paise": first_order["amount_paise"],
            "currency": first_order["currency"],
            "next_date": next_date.isoformat(),
            "message": f"SIP of ₹{amount} {normalized_frequency} created for {purpose}. First installment is ready to pay.",
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to start SIP: {str(e)}"}

@tool
def apply_mitra_insights(draft_reply: str, profile: dict[str, object]) -> str:
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