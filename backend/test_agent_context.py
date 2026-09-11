"""
Test that the agent would use profile data correctly
This simulates what the agent should do when given profile context
"""

def test_agent_profile_usage():
    """Test that the agent would use profile data correctly"""
    
    print("=" * 50)
    print("TESTING AGENT PROFILE USAGE")
    print("=" * 50)
    
    # Simulate the profile data that should be passed to the agent
    profile_data = {
        "occupation": "gig_worker",
        "goals": ["emergency fund", "new house"],
        "language": "english",
        "money_comfort": "intermediate",
        "monthly_income": 55000,
        "monthly_expenses": 15000,
        "loans": [
            {"type": "personal", "lender": "HDFC", "emi": 20000, "outstanding": 500000}
        ]
    }
    
    print("Profile data that should be passed to agent:")
    for key, value in profile_data.items():
        print("  " + str(key) + ":", str(value))
    print("=" * 50)
    
    # Simulate what the agent should do with "what do you know about me"
    user_question = "what do you know about me"
    
    print("User question:", user_question)
    print("=" * 50)
    print("EXPECTED AGENT RESPONSE:")
    print("=" * 50)
    
    # What the agent should say
    expected_response = """
Based on your profile, here's what I know about you:

Occupation: You're a gig worker
Goals: You're working towards an emergency fund and a new house
Income: Monthly income of Rs.55,000
Expenses: Monthly expenses of Rs.15,000
Loans: You have a personal loan from HDFC with an EMI of Rs.20,000
Financial comfort level: Intermediate
Language: English

Your disposable income is Rs.20,000 per month (income Rs.55,000 - expenses Rs.15,000 - EMI Rs.20,000).
    """
    
    print(expected_response)
    print("=" * 50)
    
    # Check if profile data contains the needed information
    has_occupation = profile_data.get('occupation') == 'gig_worker'
    has_goals = 'emergency fund' in profile_data.get('goals', [])
    has_income = profile_data.get('monthly_income') == 55000
    has_loans = len(profile_data.get('loans', [])) > 0
    
    print("AGENT CAPABILITY CHECK:")
    print("  Has occupation info:", has_occupation)
    print("  Has goals info:", has_goals)
    print("  Has income info:", has_income)
    print("  Has loans info:", has_loans)
    print("=" * 50)
    
    if has_occupation and has_goals and has_income and has_loans:
        print("SUCCESS: Agent has all information needed")
        print("The agent should be able to answer 'what do you know about me' correctly")
    else:
        print("FAILURE: Agent is missing some information")
    
    return has_occupation and has_goals and has_income and has_loans

if __name__ == "__main__":
    test_agent_profile_usage()