"""
Test script to verify profile context is being passed correctly to agents
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.chat import ChatRequest, process_chat

async def test_profile_context():
    """Test that profile context is being passed correctly"""
    
    # Simulate a chat request with your profile data
    test_request = ChatRequest(
        message="what do you know about me",
        mode="sahayak",
        session_id="test_session",
        user_id="user_3IxYgmntTOTYyoWz1wWPhr6RYas",
        profile={
            "occupation": "gig_worker",
            "goals": ["emergency fund", "new house"],
            "language": "english",
            "money_comfort": "intermediate",
            "monthly_income": 55000,
            "monthly_expenses": 15000,
            "savings_goal_amount": 50000,
            "loans": [
                {"type": "personal", "lender": "HDFC", "emi": 20000, "outstanding": 500000}
            ]
        }
    )
    
    print("=" * 50)
    print("TESTING PROFILE CONTEXT")
    print("=" * 50)
    print("User ID:", test_request.user_id)
    print("Message:", test_request.message)
    print("Profile being sent:")
    for key, value in test_request.profile.items():
        print("  " + str(key) + ":", str(value))
    print("=" * 50)
    
    try:
        response = await process_chat(test_request)
        print("SUCCESS: Profile context test completed")
        print("Response:", response.get('reply', 'No reply')[:200] + "...")
        
        # Check if the response mentions profile details
        reply = response.get('reply', '').lower()
        mentions_gig_worker = 'gig worker' in reply
        mentions_income = '55000' in reply or '55,000' in reply
        mentions_goals = any(goal in reply for goal in ['emergency fund', 'new house'])
        
        print("=" * 50)
        print("CONTEXT AWARENESS CHECK:")
        print("=" * 50)
        print("Mentions gig worker:", mentions_gig_worker)
        print("Mentions income:", mentions_income)
        print("Mentions goals:", mentions_goals)
        
        if mentions_gig_worker and mentions_income and mentions_goals:
            print("SUCCESS: Agent is fully context-aware!")
        else:
            print("FAILURE: Agent is NOT context-aware")
            print("The agent should mention your occupation, income, and goals")
            
    except Exception as e:
        print("ERROR:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_profile_context())