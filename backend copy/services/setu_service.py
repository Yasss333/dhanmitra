"""Server-side client for Setu UPI Deep Links; credentials never reach the browser."""
import time
import uuid
from typing import Any, Dict, Optional

import httpx
from config.settings import SETU_CLIENT_ID, SETU_CLIENT_SECRET, SETU_ENVIRONMENT, SETU_PRODUCT_INSTANCE_ID


class SetuConfigurationError(RuntimeError):
    pass


class SetuService:
    def __init__(self) -> None:
        self.client_id, self.client_secret = SETU_CLIENT_ID, SETU_CLIENT_SECRET
        self.product_instance_id = SETU_PRODUCT_INSTANCE_ID
        self.environment = SETU_ENVIRONMENT.lower()
        self.base_url = "https://uat.setu.co/api/v2" if self.environment == "sandbox" else "https://prod.setu.co/api/v2"
        self._token: Optional[str] = None
        self._token_expires_at = 0.0

    def _validate_configuration(self) -> None:
        missing = [name for name, value in (("SETU_CLIENT_ID", self.client_id), ("SETU_CLIENT_SECRET", self.client_secret), ("SETU_PRODUCT_INSTANCE_ID", self.product_instance_id)) if not value]
        if missing:
            raise SetuConfigurationError(f"Missing Setu sandbox configuration: {', '.join(missing)}")

    async def _access_token(self, client: httpx.AsyncClient) -> str:
        self._validate_configuration()
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token
        response = await client.post(f"{self.base_url}/auth/token", json={"clientID": self.client_id, "secret": self.client_secret})
        response.raise_for_status()
        body = response.json()
        token_body = body.get("data", body)
        token = token_body.get("accessToken") or token_body.get("access_token") or token_body.get("token")
        if not token:
            raise RuntimeError("Setu token response did not include an access token")
        self._token = token
        self._token_expires_at = time.time() + int(token_body.get("expiresIn") or token_body.get("expires_in") or 1800)
        return token

    async def _headers(self, client: httpx.AsyncClient) -> Dict[str, str]:
        return {"Authorization": f"Bearer {await self._access_token(client)}", "X-Setu-Product-Instance-ID": self.product_instance_id, "Content-Type": "application/json"}

    @staticmethod
    def _error(response: httpx.Response) -> str:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text
        return f"Setu API returned {response.status_code}: {detail}"

    async def create_payment_link(self, amount: int, purpose: str, **_: Any) -> Dict[str, Any]:
        if amount <= 0:
            return {"success": False, "error": "Amount must be greater than zero."}
        biller_bill_id = f"DM-{uuid.uuid4().hex[:20].upper()}"
        payload = {"billerBillID": biller_bill_id, "amount": {"value": amount * 100, "currencyCode": "INR"}, "amountExactness": "EXACT", "name": "DhanMitra Sandbox", "transactionNote": purpose[:80], "additionalInfo": {"dhanmitraReference": biller_bill_id}}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(f"{self.base_url}/payment-links", json=payload, headers=await self._headers(client))
                if not response.is_success:
                    return {"success": False, "error": self._error(response)}
                data = response.json().get("data", response.json())
        except (httpx.HTTPError, SetuConfigurationError, RuntimeError) as exc:
            return {"success": False, "error": str(exc)}
        link = data.get("paymentLink", {})
        return {"success": True, "transaction_id": data.get("platformBillID") or biller_bill_id, "biller_bill_id": biller_bill_id, "payment_link": link.get("shortURL"), "upi_deeplink": link.get("upiLink"), "upi_id": link.get("upiID"), "amount": amount, "purpose": purpose, "status": data.get("status", "BILL_GENERATED")}

    async def get_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(f"{self.base_url}/payment-links/{transaction_id}", headers=await self._headers(client))
                if not response.is_success:
                    return {"success": False, "error": self._error(response)}
                return {"success": True, "payment_details": response.json().get("data", response.json())}
        except (httpx.HTTPError, SetuConfigurationError, RuntimeError) as exc:
            return {"success": False, "error": str(exc)}

    async def add_sandbox_credit(self, transaction_id: str, amount: int, upi_id: str, payer_vpa: str) -> Dict[str, Any]:
        if self.environment != "sandbox":
            return {"success": False, "error": "Sandbox mock payments are disabled outside the sandbox."}
        if not upi_id or "@" not in upi_id or "@" not in payer_vpa:
            return {"success": False, "error": "A valid payee UPI ID and payer VPA are required."}
        payload = {"amount": amount, "type": "UPI", "destinationAccount": {"accountID": upi_id}, "sourceAccount": {"accountID": payer_vpa}, "transactionReference": transaction_id}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(f"{self.base_url}/triggers/funds/addCredit", json=payload, headers=await self._headers(client))
                if not response.is_success:
                    return {"success": False, "error": self._error(response)}
        except (httpx.HTTPError, SetuConfigurationError, RuntimeError) as exc:
            return {"success": False, "error": str(exc)}
        return {"success": True}


setu_service = SetuService()
