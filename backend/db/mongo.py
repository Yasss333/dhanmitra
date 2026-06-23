from pymongo import MongoClient
from config.settings import MONGODB_URI, DB_NAME

_client = None

def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[DB_NAME]

def get_collection(name: str):
    return get_db()[name]