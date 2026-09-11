"""
Simple test to verify profile data structure without requiring fastapi
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.mongo import get_collection

def test_profile_data():
    """Test that profile data exists in the correct format"""
    
    print("=" * 50)
    print("TESTING PROFILE DATA IN MONGODB")
    print("=" * 50)
    
    # Get your profile
    col = get_collection('users')
    user = col.find_one({'user_id': 'user_3IxYgmntTOTYyoWz1wWPhr6RYas'}, {'_id': 0})
    
    if not user:
        print("ERROR: Profile not found in MongoDB")
        return False
    
    print("Profile found in MongoDB:")
    print("User ID:", user.get('user_id'))
    print("Occupation:", user.get('occupation'))
    print("Goals:", user.get('goals'))
    print("Language:", user.get('language'))
    print("Income:", user.get('monthly_income'))
    print("Expenses:", user.get('monthly_expenses'))
    print("Loans:", user.get('loans'))
    print("=" * 50)
    
    # Check if data matches expected format
    expected_fields = {
        'occupation': 'gig_worker',
        'goals': ['emergency fund', 'new house'],
        'language': 'english',
        'monthly_income': 55000,
        'monthly_expenses': 15000
    }
    
    print("DATA VALIDATION:")
    all_correct = True
    for field, expected_value in expected_fields.items():
        actual_value = user.get(field)
        matches = actual_value == expected_value
        print(f"  {field}: {matches} (expected: {expected_value}, actual: {actual_value})")
        if not matches:
            all_correct = False
    
    print("=" * 50)
    if all_correct:
        print("SUCCESS: All profile data is correct")
    else:
        print("FAILURE: Some profile data is incorrect")
    
    return all_correct

if __name__ == "__main__":
    test_profile_data()