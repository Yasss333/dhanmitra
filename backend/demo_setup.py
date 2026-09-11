"""
Demo Data Setup Script for DhanMitra LinkedIn Demo

This script creates a demo user with pre-filled financial data
to ensure a consistent demo experience for the LinkedIn video.
"""

import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.mongo import get_collection

def setup_demo_user(clerk_user_id=None):
    """Create or update demo user with realistic financial data"""
    
    # Use provided Clerk user ID or default
    user_id = clerk_user_id or "demo_user_linkedin"
    
    # Demo user data (matches demo script requirements)
    demo_user = {
        "user_id": user_id,
        "userId": user_id,  # Legacy field
        "language": "english",
        "occupation": "gig_worker",
        "money_comfort": "intermediate",
        "goal": "emergency_fund",
        "onboarding_complete": True,
        
        # Financial data for demo
        "monthly_income": 55000,
        "monthly_expenses": 15000,
        "savings_goal_amount": 50000,
        
        # Goals for demo
        "goals": ["emergency fund", "new house"],
        
        # Pre-configured EMI for the demo scenario
        "loans": [
            {
                "type": "personal",
                "lender": "HDFC",
                "emi": 20000,
                "outstanding": 500000,
                "added_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        
        # Pre-configured SIP for demo
        "sips": [
            {
                "plan_id": "sip-demo-001",
                "amount": 1000,
                "frequency": "monthly",
                "purpose": "Mutual Fund - ELSS",
                "status": "active",
                "next_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ],
        
        # Fitness tracking
        "fitnessScore": 65,
        "fitnessLevel": "Intermediate",
        "fitnessStreak": 5,
        
        # Notes
        "notes": "Demo user for LinkedIn video showcase",
        
        # Metadata
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        users_col = get_collection("users")
        
        # Upsert demo user
        result = users_col.update_one(
            {"user_id": user_id},
            {"$set": demo_user},
            upsert=True
        )
        
        print("SUCCESS: Demo user setup complete!")
        print(f"   User ID: {user_id}")
        print(f"   Income: Rs.{demo_user['monthly_income']:,}")
        print(f"   Expenses: Rs.{demo_user['monthly_expenses']:,}")
        print(f"   Savings Goal: Rs.{demo_user['savings_goal_amount']:,}")
        print(f"   Current EMI: Rs.{demo_user['loans'][0]['emi']:,}")
        print(f"   Occupation: {demo_user['occupation']}")
        print(f"   Fitness Score: {demo_user['fitnessScore']}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Error setting up demo user: {str(e)}")
        return False

def setup_demo_schemes():
    """Ensure government schemes are seeded for demo"""
    
    try:
        schemes_col = get_collection("schemes")
        
        # Check if schemes exist
        existing_count = schemes_col.count_documents({})
        
        if existing_count > 0:
            print(f"SUCCESS: {existing_count} schemes already exist in database")
            return True
        
        # Import seed schemes from the schemes API
        from api.schemes import SEED_SCHEMES
        
        for scheme in SEED_SCHEMES:
            schemes_col.update_one(
                {"scheme_id": scheme["scheme_id"]},
                {"$set": scheme},
                upsert=True
            )
        
        print(f"SUCCESS: Seeded {len(SEED_SCHEMES)} government schemes")
        return True
        
    except Exception as e:
        print(f"ERROR: Error setting up demo schemes: {str(e)}")
        return False

def setup_demo_chat_history(clerk_user_id=None):
    """Create some demo chat history for realistic demo experience"""
    
    user_id = clerk_user_id or "demo_user_linkedin"
    
    try:
        chat_col = get_collection("chat_history")
        
        # Demo chat session
        demo_session = {
            "session_id": f"demo_session_{user_id}",
            "user_id": user_id,
            "mode": "sahayak",
            "messages": [
                {
                    "role": "user",
                    "content": "Show me government schemes for gig workers",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
                },
                {
                    "role": "assistant",
                    "content": "Here are some great schemes for gig workers:\n\n1. **PM SVANidhi** - Working capital loans for street vendors (Rs.10,000 -> Rs.20,000 -> Rs.50,000)\n2. **PM Mudra Yojana** - Collateral-free loans for small businesses (up to Rs.10 lakh)\n3. **PM E-Drive Scheme** - Subsidy on electric vehicles (Rs.10,000 on e-2W, Rs.50,000 on e-3W)\n\nWould you like me to help you apply for any of these?",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
                },
                {
                    "role": "user",
                    "content": "I have an EMI of Rs.20,000, should I take another EMI of Rs.5,000?",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                },
                {
                    "role": "assistant",
                    "content": "Let me analyze your EMI affordability based on your current financial situation:\n\n**Current Debt-to-Income Ratio:** 80% (Rs.20,000 EMI on Rs.25,000 income)\n**New Debt-to-Income Ratio:** 100% (Rs.25,000 total EMI on Rs.25,000 income)\n\n**CAUTION:** Taking another EMI of Rs.5,000 would push your debt-to-income ratio to 100%, which is extremely risky.\n\n**Recommendation:** I would NOT recommend taking this additional EMI. Consider:\n1. Building an emergency fund first\n2. Reducing existing debt before taking new loans\n3. Exploring lower-cost alternatives\n\nYour current disposable income is Rs.10,000/month (income Rs.25,000 - expenses Rs.15,000 - current EMI Rs.20,000 would leave you with Rs.0 disposable).",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                }
            ],
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        chat_col.update_one(
            {"session_id": f"demo_session_{user_id}"},
            {"$set": demo_session},
            upsert=True
        )
        
        print("SUCCESS: Demo chat history created")
        return True
        
    except Exception as e:
        print(f"ERROR: Error setting up demo chat history: {str(e)}")
        return False

def main():
    """Run all demo setup tasks"""
    
    import sys
    
    # Accept clerk user ID as command line argument
    clerk_user_id = None
    if len(sys.argv) > 1:
        clerk_user_id = sys.argv[1]
        print(f"Using Clerk User ID: {clerk_user_id}")
    else:
        print("No Clerk User ID provided. Using default demo user.")
        print("To use your own Clerk user, run: python demo_setup.py <your_clerk_user_id>")
    
    print("Setting up DhanMitra Demo Data for LinkedIn Video...")
    print()
    
    success = True
    
    # Setup demo user
    if not setup_demo_user(clerk_user_id):
        success = False
    
    print()
    
    # Setup demo schemes
    if not setup_demo_schemes():
        success = False
    
    print()
    
    # Setup demo chat history
    if not setup_demo_chat_history(clerk_user_id):
        success = False
    
    print()
    
    user_id = clerk_user_id or "demo_user_linkedin"
    
    if success:
        print("SUCCESS: Demo data setup complete! Ready for LinkedIn demo recording.")
        print()
        print("Demo User Credentials:")
        print(f"   User ID: {user_id}")
        print("   (Use this for testing in the frontend)")
        if clerk_user_id:
            print(f"   (Linked to your Clerk user: {clerk_user_id})")
    else:
        print("ERROR: Some demo setup tasks failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()