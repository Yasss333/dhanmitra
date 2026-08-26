from fastapi import APIRouter, Request, HTTPException
from services.telegram_service import TelegramService
from services.telegram_link_service import telegram_link_service
from api.chat import ChatRequest, process_chat
from config.settings import TELEGRAM_WEBHOOK_SECRET
import json

router = APIRouter()
telegram_service = TelegramService()

def format_welcome_message():
    """Format a beautiful welcome message"""
    return """
🙏 *Welcome to DhanMitra!*

Your personal financial assistant for Bharat.

*Available Commands:*
/start - Show this welcome message
/link <code> - Link your Telegram account to DhanMitra
/profile - View your linked profile
/unlink - Unlink your Telegram account

*How to get started:*
1. Log in to DhanMitra web app
2. Go to Settings → Connect Telegram
3. Get your verification code
4. Send `/link <code>` here

*Features:*
💬 Personalized financial advice
🗣️ Voice message support
📊 Government scheme information
🌐 Multi-language support

Type your question or use voice messages to get started!
"""

def format_profile_message(profile):
    """Format user profile message beautifully"""
    if not profile:
        return """
❌ *No Profile Found*

You haven't linked your Telegram account to DhanMitra yet.

Use `/link <code>` to connect your account and get personalized responses.
"""
    
    language = profile.get("language", "english").title()
    occupation = profile.get("occupation", "other").replace("_", " ").title()
    money_comfort = profile.get("money_comfort", "beginner").replace("_", " ").title()
    goal = profile.get("goal", "emergency_fund").replace("_", " ").title()
    fitness_score = profile.get("financial_fitness_score", 0)
    
    return f"""
✅ *Your DhanMitra Profile*

👤 *Language:* {language}
💼 *Occupation:* {occupation}
📈 *Financial Knowledge:* {money_comfort}
🎯 *Goal:* {goal}
💪 *Fitness Score:* {fitness_score}/100

Your responses are now personalized based on your profile!
"""

def format_error_message(message):
    """Format error message beautifully"""
    return f"""
❌ *Error*

{message}

Please try again or use /start for help.
"""

@router.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    try:
        if TELEGRAM_WEBHOOK_SECRET and request.headers.get("X-Telegram-Bot-Api-Secret-Token") != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")

        payload = await request.json()
        print(f"[DEBUG] Full payload: {json.dumps(payload, indent=2)}")
        
        message = payload.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text")
        voice = message.get("voice")
        username = message.get("from", {}).get("username")
        
        print(f"[DEBUG] chat_id: {chat_id}, text: {text}, voice: {voice}, username: {username}")
        
        if not chat_id:
            print("[DEBUG] No chat_id, ignoring")
            return {"status": "ignored"}

        if not isinstance(chat_id, int):
            print(f"[ERROR] Invalid Telegram chat_id: {chat_id!r}")
            return {"status": "ignored", "reason": "invalid chat_id"}

        # Handle commands
        if text and text.startswith("/"):
            return await handle_command(chat_id, text, username)
        
        # Determine user message
        if voice:
            print("[DEBUG] Voice message detected")
            file_id = voice.get("file_id")
            audio_file = await telegram_service.download_file(file_id)
            user_message = await telegram_service.transcribe_audio(audio_file)
            print(f"[DEBUG] Transcribed: {user_message}")
        elif text:
            print(f"[DEBUG] Text message: {text}")
            user_message = text
        else:
            print("[DEBUG] Unknown message type, ignoring")
            return {"status": "ignored"}
        
        # Get user profile if linked
        user_profile = telegram_link_service.get_user_by_chat_id(chat_id)
        
        # Prepare chat request
        if user_profile:
            # Use linked user profile
            profile_data = {
                "language": user_profile.get("language", "english"),
                "occupation": user_profile.get("occupation", "other"),
                "money_comfort": user_profile.get("money_comfort", "beginner"),
                "goal": user_profile.get("goal", "emergency_fund"),
                "fitnessScore": user_profile.get("financial_fitness_score", 0),
                "fitnessLevel": user_profile.get("fitness_level", "Beginner"),
                "fitnessStreak": user_profile.get("fitness_streak", 0),
            }
            user_id = user_profile.get("user_id")
            print(f"[DEBUG] Using linked user profile for {user_id}")
        else:
            # Use generic profile for unlinked users
            profile_data = {}
            user_id = f"telegram_{chat_id}"
            print(f"[DEBUG] Using generic profile for unlinked user")
        
        chat_req = ChatRequest(
            message=user_message,
            mode="sahayak",
            session_id=f"telegram_{chat_id}",
            user_id=user_id,
            profile=profile_data
        )
        print("[DEBUG] Calling process_chat...")
        
        # Process with Agno
        result = await process_chat(chat_req)
        reply = result.get("reply", "Sorry, I couldn't process that.")
        print(f"[DEBUG] Reply: {reply}")
        
        # Add prompt to link if not linked
        if not user_profile:
            reply += "\n\n💡 *Tip:* Link your account for personalized responses! Use `/link <code>` to connect."
        
        # Send reply
        print(f"[DEBUG] Sending reply to chat_id: {chat_id}")
        # Model replies use standard Markdown, which Telegram's legacy Markdown parser rejects.
        sent = await telegram_service.send_message(chat_id, reply)
        if not sent:
            print(f"[ERROR] Telegram reply was not sent to chat_id={chat_id}")
            return {"status": "error", "reason": "telegram sendMessage failed"}
        print("[DEBUG] Reply sent successfully")
        
        return {"status": "ok"}
    
    except Exception as e:
        print(f"[ERROR] Telegram webhook error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "detail": str(e)}

async def handle_command(chat_id: int, text: str, username: str = None):
    """Handle Telegram bot commands"""
    async def reply(message: str, parse_mode: str = "Markdown"):
        sent = await telegram_service.send_message(chat_id, message, parse_mode=parse_mode)
        return sent

    command = text.strip()
    command_name, _, command_arg = command.partition(" ")
    command_name = command_name.split("@", 1)[0].lower()
    
    if command_name == "/start":
        sent = await reply(format_welcome_message())
        return {"status": "ok" if sent else "error", "command": "start"}
    
    elif command_name == "/link":
        code = command_arg.strip()
        if not code:
            sent = await reply("❌ Please provide a verification code.\nUsage: /link <CODE>")
            return {"status": "error" if not sent else "ok", "reason": "no code provided"}
        
        success = telegram_link_service.verify_and_link(chat_id, code, username)
        if success:
            sent = await reply("✅ *Account Linked Successfully!*\n\nYour Telegram account is now connected to DhanMitra. You'll receive personalized responses based on your profile.")
            return {"status": "ok" if sent else "error", "command": "link"}
        else:
            sent = await reply("❌ *Invalid Verification Code*\n\nPlease check the code and try again. Make sure you've generated a fresh code from the DhanMitra web app.")
            return {"status": "error", "reason": "invalid code", "reply_sent": sent}
    
    elif command_name == "/profile":
        user_profile = telegram_link_service.get_user_by_chat_id(chat_id)
        await telegram_service.send_message(chat_id, format_profile_message(user_profile), parse_mode="Markdown")
        return {"status": "ok", "command": "profile"}
    
    elif command_name == "/unlink":
        # For unlinking, we need the user_id from the link
        link = telegram_link_service.links_collection.find_one({
            "telegram_chat_id": chat_id,
            "is_verified": True
        })
        
        if link:
            success = telegram_link_service.unlink_telegram(link["user_id"])
            if success:
                await telegram_service.send_message(
                    chat_id,
                    "✅ *Account Unlinked*\n\nYour Telegram account has been disconnected from DhanMitra. You can link it again anytime.",
                    parse_mode="Markdown"
                )
                return {"status": "ok", "command": "unlink"}
        
        await telegram_service.send_message(
            chat_id,
            "❌ *No Linked Account Found*\n\nYou don't have a linked DhanMitra account to unlink.",
            parse_mode="Markdown"
        )
        return {"status": "error", "reason": "no linked account"}
    
    elif command_name == "/chatid":
        await telegram_service.send_message(chat_id, f"Your Chat ID: `{chat_id}`", parse_mode="Markdown")
        return {"status": "ok", "command": "chatid"}
    
    elif command_name == "/botinfo":
        bot_info = await telegram_service.get_bot_info()
        username = bot_info.get("username", "unknown")
        bot_id = bot_info.get("id", "unknown")
        await telegram_service.send_message(
            chat_id,
            f"🤖 *Bot Information*\n\nUsername: @{username}\nBot ID: `{bot_id}`",
            parse_mode="Markdown"
        )
        return {"status": "ok", "command": "botinfo"}
    
    else:
        await telegram_service.send_message(
            chat_id,
            f"❓ *Unknown Command: {text}*\n\nUse /start to see available commands.",
            parse_mode="Markdown"
        )
        return {"status": "error", "reason": "unknown command"}