import os
import tempfile
import httpx
import whisper
from config.settings import TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET

class TelegramService:
    def __init__(self):
        self.token = TELEGRAM_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.token}"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.whisper_model = whisper.load_model("base")

    def _masked_api_url(self, endpoint: str) -> str:
        """Return an API URL safe to include in logs."""
        token = self.token or ""
        if len(token) <= 8:
            masked_token = "<missing-or-too-short-token>"
        else:
            masked_token = f"{token[:4]}...{token[-4:]}"
        return f"https://api.telegram.org/bot{masked_token}/{endpoint}"

    async def get_bot_info(self) -> dict:
        """Fetch bot info from Telegram (for debugging)."""
        response = await self.client.get(f"{self.api_url}/getMe")
        print(f"[DEBUG] Telegram getMe URL: {self._masked_api_url('getMe')}")
        print(f"[DEBUG] Telegram getMe response: {response.status_code} - {response.text}")
        response.raise_for_status()
        return response.json().get("result", {})

    async def get_updates(self) -> list:
        """Fetch recent Telegram updates to help identify valid chat IDs."""
        response = await self.client.get(f"{self.api_url}/getUpdates")
        print(f"[DEBUG] Telegram getUpdates URL: {self._masked_api_url('getUpdates')}")
        print(f"[DEBUG] Telegram getUpdates response: {response.status_code} - {response.text}")
        response.raise_for_status()
        return response.json().get("result", [])

    async def get_webhook_info(self) -> dict:
        """Fetch webhook state without conflicting with the active webhook."""
        response = await self.client.get(f"{self.api_url}/getWebhookInfo")
        response.raise_for_status()
        return response.json().get("result", {})

    async def set_webhook(self, webhook_url: str) -> bool:
        """Register the Telegram webhook when a public URL is configured."""
        payload = {"url": webhook_url}
        if TELEGRAM_WEBHOOK_SECRET:
            payload["secret_token"] = TELEGRAM_WEBHOOK_SECRET
        response = await self.client.post(f"{self.api_url}/setWebhook", json=payload)
        response.raise_for_status()
        return bool(response.json().get("ok"))

    async def download_file(self, file_id: str) -> str:
        resp = await self.client.get(f"{self.api_url}/getFile?file_id={file_id}")
        data = resp.json()
        file_path = data.get("result", {}).get("file_path")
        if not file_path:
            raise Exception("Could not get file path")
        file_url = f"https://api.telegram.org/file/bot{self.token}/{file_path}"
        resp = await self.client.get(file_url)
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=".ogg")
        temp.write(resp.content)
        temp.close()
        return temp.name

    async def transcribe_audio(self, file_path: str) -> str:
        try:
            result = self.whisper_model.transcribe(file_path)
            return result["text"]
        except Exception as e:
            print(f"Whisper error: {e}")
            return "Sorry, I couldn't understand the voice message. Please type your question."
        finally:
            try:
                os.remove(file_path)
            except:
                pass

    # ✅ THIS IS THE METHOD THAT WAS MISSING
    async def send_message(self, chat_id: int, text: str, parse_mode: str = None):
        if chat_id is None:
            raise ValueError("chat_id cannot be None")
        try:
            chat_id = int(chat_id)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"chat_id must be an integer, got {chat_id!r}") from exc

        print(f"[DEBUG] send_message called with chat_id={chat_id}")
        try:
            chunks = [text[i:i + 4096] for i in range(0, len(text), 4096)] or [""]
            for chunk in chunks:
                payload = {"chat_id": chat_id, "text": chunk}
                if parse_mode:
                    payload["parse_mode"] = parse_mode
                print(f"[DEBUG] Telegram sendMessage URL: {self._masked_api_url('sendMessage')}")
                print(f"[DEBUG] Telegram sendMessage payload: {payload}")
                resp = await self.client.post(
                    f"{self.api_url}/sendMessage",
                    json=payload
                )
                print(f"[DEBUG] sendMessage response: {resp.status_code} - {resp.text}")
                resp.raise_for_status()
            return True
        except Exception as e:
            error_text = str(e)
            print(f"[ERROR] send_message failed: {type(e).__name__}: {error_text.split(' for url ')[0]}")
            print(f"[ERROR] Telegram sendMessage URL: {self._masked_api_url('sendMessage')}")
            print(f"[ERROR] Telegram sendMessage payload: {{'chat_id': {chat_id}, 'text': {text!r}}}")
            if "chat not found" in error_text.lower():
                print(
                    "[ERROR] Telegram cannot deliver to this chat. Check that the configured bot "
                    "is the bot the user opened, that the user sent /start, and that the bot is not blocked."
                )
            return False

    async def close(self):
        await self.client.aclose()