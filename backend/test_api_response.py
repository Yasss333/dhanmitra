"""
Test the API response format to ensure it matches what the frontend expects
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.mongo import get_collection

def test_api_response_format():
    """Test that the API response format matches frontend expectations"""
    
    print("=" * 50)
    print("TESTING API RESPONSE FORMAT")
    print("=" * 50)
    
    # Simulate what the API returns
    col = get_collection('users')
    doc = col.find_one({'user_id': 'user_3IxYgmntTOTYyoWz1wWPhr6RYas'}, {'_id': 0})
    
    print("API Response Format (from MongoDB):")
    print(doc)
    print("=" * 50)
    
    # Check if it matches the format frontend expects
    frontend_expected_fields = [
        'occupation', 'goals', 'language', 'monthly_income', 
        'monthly_expenses', 'money_comfort', 'loans'
    ]
    
    print("FRONTEND EXPECTED FIELDS CHECK:")
    all_present = True
    for field in frontend_expected_fields:
        present = field in doc
        print(f"  {field}: {present}")
        if not present:
            all_present = False
    
    print("=" * 50)
    if all_present:
        print("SUCCESS: All expected fields are present")
    else:
        print("FAILURE: Some expected fields are missing")
    
    return all_present

if __name__ == "__main__":
    test_api_response_format()