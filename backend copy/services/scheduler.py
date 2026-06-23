from apscheduler.schedulers.background import BackgroundScheduler
from db.mongo import get_collection
from datetime import datetime, timezone

scheduler = BackgroundScheduler()

def recalculate_fitness_scores():
    """Nightly job — placeholder, expand with real scoring logic."""
    users = get_collection("users")
    conversations = get_collection("conversations")
    print(f"[Scheduler] Running fitness score recalculation at {datetime.now(timezone.utc).isoformat()}")

def start_scheduler():
    scheduler.add_job(recalculate_fitness_scores, "cron", hour=2, minute=0)
    scheduler.start()
    print("[Scheduler] Started")

def stop_scheduler():
    scheduler.shutdown()