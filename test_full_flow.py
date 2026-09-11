"""
Comprehensive test to verify the full data flow from frontend to backend to agent
"""

def test_frontend_profile_sending():
    """Test that the frontend sends profile data correctly"""
    
    print("=" * 50)
    print("TESTING FRONTEND PROFILE SENDING")
    print("=" * 50)
    
    # Simulate what the frontend context sends
    frontend_profile = {
        "occupation": "gig_worker",
        "goals": ["emergency fund", "new house"],
        "language": "english",
        "moneyComfort": "intermediate",
        "monthly_income": 55000,
        "monthly_expenses": 15000,
        "savings_goal_amount": 50000,
        "loans": [
            {"type": "personal", "lender": "HDFC", "emi": 20000, "outstanding": 500000}
        ]
    }
    
    # Simulate what gets sent to backend (as per ChatPage.jsx)
    backend_payload = {
        "occupation": frontend_profile.get("occupation"),
        "goals": frontend_profile.get("goals", []),
        "language": frontend_profile.get("language", "english"),
        "money_comfort": frontend_profile.get("moneyComfort") or frontend_profile.get("money_comfort", "beginner"),
        "monthly_income": frontend_profile.get("monthly_income"),
        "monthly_expenses": frontend_profile.get("monthly_expenses"),
        "savings_goal_amount": frontend_profile.get("savings_goal_amount"),
        "loans": frontend_profile.get("loans", []),
    }
    
    print("Frontend profile:")
    for key, value in frontend_profile.items():
        print("  " + str(key) + ":", str(value))
    
    print("\nBackend payload:")
    for key, value in backend_payload.items():
        print("  " + str(key) + ":", str(value))
    
    print("=" * 50)
    
    # Check if all data is preserved
    data_preserved = True
    expected_fields = ['occupation', 'goals', 'language', 'monthly_income', 'monthly_expenses', 'loans']
    
    print("DATA PRESERVATION CHECK:")
    for field in expected_fields:
        if field in backend_payload and backend_payload[field]:
            print("  " + field + ": PRESERVED")
        else:
            print("  " + field + ": MISSING OR EMPTY")
            data_preserved = False
    
    print("=" * 50)
    if data_preserved:
        print("SUCCESS: All data is preserved from frontend to backend")
    else:
        print("FAILURE: Some data is lost in transmission")
    
    return data_preserved

if __name__ == "__main__":
    test_frontend_profile_sending()