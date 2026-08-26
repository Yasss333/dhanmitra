import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

client_id = os.getenv("SETU_CLIENT_ID")
client_secret = os.getenv("SETU_CLIENT_SECRET")
merchant_id = os.getenv("SETU_MERCHANT_ID")

print(f"Client ID: {client_id}")
print(f"Merchant ID: {merchant_id}")
print(f"Client Secret (first 4 chars): {client_secret[:4]}...")

payload = {
    "clientId": client_id,
    "merchantId": merchant_id,
    "iat": int(datetime.now().timestamp()),
    "exp": int((datetime.now() + timedelta(minutes=10)).timestamp())
}

token = jwt.encode(payload, client_secret, algorithm="HS256")
print(f"Generated Token: {token}")