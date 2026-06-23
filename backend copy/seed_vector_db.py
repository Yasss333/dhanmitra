"""
One-time script to seed LanceDB with scheme documents from MongoDB.
Run this AFTER seeding MongoDB, BEFORE testing chat.
Usage: python seed_vector_db.py
"""

from agents.agno_setup import seed_knowledge_base

if __name__ == "__main__":
    print("🚀 Starting LanceDB seeding...")
    seed_knowledge_base()
    print("✅ Done.")


# # seed_vector_db.py
# """
# Run this script ONCE to initialize the LanceDB vector store
# with all your government schemes and financial documents.
# """

# import sys
# import os

# # Add the current directory to path so we can import agents
# sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# from agents.agno_setup import seed_knowledge_base
# from db.mongo import get_collection

# if __name__ == "__main__":
#     print("🚀 Starting LanceDB seeding...")
    
#     # First, check if MongoDB has any schemes
#     schemes_count = get_collection("schemes").count_documents({})
#     if schemes_count == 0:
#         print("⚠️  No schemes found in MongoDB!")
#         print("👉 Please seed MongoDB first by calling /api/schemes/seed endpoint")
#         print("   Or run: curl -X GET http://localhost:8000/api/schemes/seed")
#         sys.exit(1)
    
#     print(f"✅ Found {schemes_count} schemes in MongoDB. Seeding LanceDB...")
    
#     try:
#         seed_knowledge_base()
#         print("✅ LanceDB seeding complete! Vector store is ready.")
#         print(f"📁 Vector data stored at: ./vector_store/")
#     except Exception as e:
#         print(f"❌ Error seeding LanceDB: {e}")
#         sys.exit(1)