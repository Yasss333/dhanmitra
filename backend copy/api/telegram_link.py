from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.telegram_link_service import telegram_link_service
from api.telegram import telegram_service

router = APIRouter()

class GenerateLinkRequest(BaseModel):
    user_id: str

class VerifyLinkRequest(BaseModel):
    chat_id: int
    verification_code: str
    username: str = None

class UnlinkRequest(BaseModel):
    user_id: str

@router.post("/telegram/generate-link-code")
async def generate_link_code(request: GenerateLinkRequest):
    """Generate a verification code for linking Telegram account"""
    try:
        code = telegram_link_service.create_link_request(request.user_id)
        bot_info = await telegram_service.get_bot_info()
        return {
            "status": "success",
            "verification_code": code,
            "bot_username": bot_info.get("username"),
            "message": "Send this code to the Telegram bot with /link command"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/telegram/verify-link")
async def verify_link(request: VerifyLinkRequest):
    """Verify the code and complete the linking process"""
    try:
        success = telegram_link_service.verify_and_link(
            request.chat_id,
            request.verification_code,
            request.username
        )
        
        if success:
            return {
                "status": "success",
                "message": "Telegram account linked successfully"
            }
        else:
            return {
                "status": "error",
                "message": "Invalid or expired verification code"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/telegram/unlink")
async def unlink_telegram(request: UnlinkRequest):
    """Unlink Telegram account from user"""
    try:
        success = telegram_link_service.unlink_telegram(request.user_id)
        
        if success:
            return {
                "status": "success",
                "message": "Telegram account unlinked successfully"
            }
        else:
            return {
                "status": "error",
                "message": "No linked Telegram account found"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/telegram/link-status/{user_id}")
async def get_link_status(user_id: str):
    """Get Telegram link status for a user"""
    try:
        status = telegram_link_service.get_link_status(user_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))