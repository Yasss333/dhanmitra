import httpx, json

# Get token
token_resp = httpx.post("https://uat.setu.co/api/v2/auth/token", json={
    "clientID": "ab52c27a-942e-44cc-8ab2-188252c2c162",
    "secret": "hqQFUeRCDnrefNaoTEjr1Kv75Po685zF"
}, timeout=15.0)
token = token_resp.json()["data"]["token"]
print(f"Token OK")

headers_base = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Test 1: The product ID the user gave
print("\n=== Test 1: Original product ID ===")
h1 = {**headers_base, "X-Setu-Product-Instance-ID": "01M0ZK5YETKAN7M3ZDSVEDM6BB"}
r1 = httpx.post("https://uat.setu.co/api/v2/payment-links", json={
    "billerBillID": "DM-T1", "amount": {"value": 10000, "currencyCode": "INR"},
    "amountExactness": "EXACT", "name": "Test", "transactionNote": "Test"
}, headers=h1, timeout=20.0)
print(f"  Status: {r1.status_code} - {r1.json().get('error', {}).get('detail', 'OK')[:100]}")

# Test 2: Try with the child sub-org ID as product ID
# The JWT shows the sub-org might be a41f03fd-1631-431b-99f9-5157491e5c8b
print("\n=== Test 2: Try sub-org ID as product ID ===")
h2 = {**headers_base, "X-Setu-Product-Instance-ID": "a41f03fd-1631-431b-99f9-5157491e5c8b"}
r2 = httpx.post("https://uat.setu.co/api/v2/payment-links", json={
    "billerBillID": "DM-T2", "amount": {"value": 10000, "currencyCode": "INR"},
    "amountExactness": "EXACT", "name": "Test", "transactionNote": "Test"
}, headers=h2, timeout=20.0)
print(f"  Status: {r2.status_code} - {r2.json().get('error', {}).get('detail', 'OK')[:100]}")

# Test 3: Try v1 endpoint (non-OAuth)
print("\n=== Test 3: v1 endpoint ===")
h3 = {**headers_base, "X-Setu-Product-Instance-ID": "01M0ZK5YETKAN7M3ZDSVEDM6BB"}
r3 = httpx.post("https://uat.setu.co/api/payment-links", json={
    "billerBillID": "DM-T3", "amount": {"value": 10000, "currencyCode": "INR"},
    "amountExactness": "EXACT", "name": "Test", "transactionNote": "Test"
}, headers=h3, timeout=20.0)
print(f"  Status: {r3.status_code} - {r3.text[:200]}")

# Test 4: Try the triggers endpoint to see if product ID works there
print("\n=== Test 4: Try triggers endpoint ===")
h4 = {**headers_base, "X-Setu-Product-Instance-ID": "01M0ZK5YETKAN7M3ZDSVEDM6BB"}
r4 = httpx.post("https://uat.setu.co/api/v2/triggers/funds/addCredit", json={
    "amount": 100, "type": "UPI",
    "destinationAccount": {"accountID": "test@kaypay"},
    "sourceAccount": {"accountID": "dummy@upi"},
    "transactionReference": "test-ref"
}, headers=h4, timeout=20.0)
print(f"  Status: {r4.status_code} - {r4.text[:200]}")

# Test 5: Check the bridge API for product details
print("\n=== Test 5: Try listing products via bridge API ===")
for endpoint in ["/merchants", "/products", "/biller", "/payment-links"]:
    try:
        r = httpx.get(f"https://uat.setu.co/api/v2{endpoint}", headers=h3, timeout=10.0)
        print(f"  {endpoint}: {r.status_code}")
    except Exception as e:
        print(f"  {endpoint}: ERROR - {str(e)[:80]}")
