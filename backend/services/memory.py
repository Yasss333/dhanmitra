from datetime import datetime, timezone
from db.mongo import get_collection

def get_session_messages(session_id: str) -> list:
    col = get_collection("conversations")
    doc = col.find_one({"session_id": session_id})
    if not doc:
        return []
    return doc.get("messages", [])

def append_message(session_id: str, user_id: str, mode: str, role: str, content: str):
    col = get_collection("conversations")
    now = datetime.now(timezone.utc).isoformat()
    col.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "user_id": user_id,
                "mode": mode,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
            "$push": {"messages": {"role": role, "content": content}},
        },
        upsert=True,
    )

def get_recent_messages(session_id: str, limit: int = 10) -> list:
    messages = get_session_messages(session_id)
    return messages[-limit:] if len(messages) > limit else messages

def get_user_sessions(user_id: str, limit: int = 20) -> list:
    col = get_collection("conversations")
    docs = col.find(
        {"user_id": user_id},
        {"session_id": 1, "updated_at": 1, "messages": {"$slice": -1}}
    ).sort("updated_at", -1).limit(limit)
    sessions = []
    for doc in docs:
        last_msg = doc.get("messages", [{}])[-1] if doc.get("messages") else {}
        sessions.append({
            "session_id": doc.get("session_id"),
            "updated_at": doc.get("updated_at"),
            "last_message": last_msg.get("content", ""),
        })
    return sessions