import json
from datetime import datetime
from typing import Optional, Dict, Any
import httpx
from config.settings import WHATSAPP_BRIDGE_URL

class WhatsAppService:
    """Service to interact with the WhatsApp bridge"""
    
    def __init__(self):
        self.bridge_url = WHATSAPP_BRIDGE_URL or "http://localhost:3001"
        self.client = httpx.Client(timeout=30.0)
    
    def get_status(self) -> Dict[str, Any]:
        """Get WhatsApp connection status"""
        try:
            response = self.client.get(f"{self.bridge_url}/status")
            return response.json()
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def send_message(self, to: str, message: str) -> Dict[str, Any]:
        """Send a message via WhatsApp"""
        try:
            response = self.client.post(
                f"{self.bridge_url}/send",
                json={"to": to, "message": message}
            )
            return response.json()
        except Exception as e:
            return {"success": False, "error": str(e)}

whatsapp_service = WhatsAppService()