import secrets
from datetime import datetime, timedelta, timezone
from db.mongo import get_collection
from models.telegram_link import TelegramLink

class TelegramLinkService:
    LINK_CODE_TTL = timedelta(minutes=10)

    def __init__(self):
        self.collection = get_collection("telegram_links")
    
    @property
    def links_collection(self):
        """Expose collection for external access"""
        return self.collection
    
    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code"""
        return secrets.token_hex(3).upper()
    
    def create_link_request(self, user_id: str) -> str:
        """Create a new link request and return verification code"""
        # Clean up any existing unverified links for this user
        self.collection.delete_many({
            "user_id": user_id,
            "is_verified": False
        })
        
        verification_code = self.generate_verification_code()
        
        link_data = {
            "user_id": user_id,
            "telegram_chat_id": None,
            "telegram_username": None,
            "verification_code": verification_code,
            "linked_at": None,
            "is_verified": False,
            "created_at": datetime.now(timezone.utc)
        }
        
        self.collection.insert_one(link_data)
        return verification_code
    
    def verify_and_link(self, chat_id: int, verification_code: str, username: str = None) -> bool:
        """Verify code and link Telegram account to user"""
        link_request = self.collection.find_one({
            "verification_code": verification_code.upper(),
            "is_verified": False
        })
        
        if not link_request:
            return False

        created_at = link_request.get("created_at")
        if not created_at or self._is_expired(created_at):
            self.collection.delete_one({"_id": link_request["_id"]})
            return False
        
        # Check if this chat_id is already linked to another user
        existing_link = self.collection.find_one({
            "telegram_chat_id": chat_id,
            "is_verified": True
        })
        
        if existing_link:
            # Unlink the old connection first
            self.collection.update_one(
                {"_id": existing_link["_id"]},
                {"$set": {"is_verified": False, "telegram_chat_id": None}}
            )
        
        # Update the link request with Telegram details
        self.collection.update_one(
            {"_id": link_request["_id"]},
            {
                "$set": {
                    "telegram_chat_id": chat_id,
                    "telegram_username": username,
                    "linked_at": datetime.now(timezone.utc),
                    "is_verified": True
                }
            }
        )
        
        return True

    def _is_expired(self, created_at: datetime) -> bool:
        """Handle both timezone-aware and legacy naive Mongo timestamps."""
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - created_at > self.LINK_CODE_TTL
    
    def get_user_by_chat_id(self, chat_id: int) -> dict:
        """Get user profile by Telegram chat ID"""
        link = self.collection.find_one({
            "telegram_chat_id": chat_id,
            "is_verified": True
        })
        
        if not link:
            return None
        
        # Get user profile from users collection
        user_collection = get_collection("users")
        user_profile = user_collection.find_one({"user_id": link["user_id"]})
        
        if user_profile:
            user_profile["_id"] = str(user_profile["_id"])
            return user_profile
        
        return None
    
    def unlink_telegram(self, user_id: str) -> bool:
        """Unlink Telegram account from user"""
        result = self.collection.update_one(
            {
                "user_id": user_id,
                "is_verified": True
            },
            {
                "$set": {
                    "is_verified": False,
                    "telegram_chat_id": None,
                    "telegram_username": None
                }
            }
        )
        return result.modified_count > 0
    
    def get_link_status(self, user_id: str) -> dict:
        """Get Telegram link status for a user"""
        link = self.collection.find_one({
            "user_id": user_id,
            "is_verified": True
        })
        
        if link:
            return {
                "is_linked": True,
                "telegram_username": link.get("telegram_username"),
                "linked_at": link.get("linked_at")
            }
        
        return {"is_linked": False}

telegram_link_service = TelegramLinkService()