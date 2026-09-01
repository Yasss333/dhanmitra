from apscheduler.schedulers.background import BackgroundScheduler
from db.mongo import get_collection
from datetime import datetime, timezone

scheduler = BackgroundScheduler()


def recalculate_fitness_scores():
    """Nightly job — recalculates fitness scores for all users based on conversation activity."""
    users_col = get_collection("users")
    conversations_col = get_collection("conversations")
    now = datetime.now(timezone.utc)
    print(f"[Scheduler] Running fitness score recalculation at {now.isoformat()}")

    for user_doc in users_col.find({}):
        user_id = user_doc.get("user_id")
        if not user_id:
            continue

        # Count total conversations for this user
        session_count = conversations_col.count_documents({"user_id": user_id})

        # Calculate score: base 10, +5 per session (capped at 100)
        base_score = 10
        session_bonus = min(session_count * 5, 90)
        new_score = base_score + session_bonus

        # Only update if score changed
        old_score = user_doc.get("financial_fitness_score", 0)
        if new_score != old_score:
            users_col.update_one(
                {"user_id": user_id},
                {"$set": {"financial_fitness_score": new_score, "updated_at": now.isoformat()}}
            )
            print(f"[Scheduler] Updated {user_id}: {old_score} -> {new_score}")

    print("[Scheduler] Fitness score recalculation complete")


def start_scheduler():
    scheduler.add_job(recalculate_fitness_scores, "cron", hour=2, minute=0)
    scheduler.start()
    print("[Scheduler] Started")


def stop_scheduler():
    scheduler.shutdown()
