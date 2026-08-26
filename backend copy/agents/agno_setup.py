import os
from agno.models.openai import OpenAIChat
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.knowledge.embedder.base import Embedder
from agno.knowledge.knowledge import Knowledge
from sentence_transformers import SentenceTransformer
from config.settings import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    DEFAULT_MODEL,
    VECTOR_DB_PATH
)

# ----- LLM Model -----
def get_llm_model():
    return OpenAIChat(
        id=DEFAULT_MODEL,
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        temperature=0.5,
    )

# ----- Custom Embedder (using sentence_transformers) -----
class CustomEmbedder(Embedder):
    def __init__(self, model_name="paraphrase-multilingual-MiniLM-L12-v2"):
        self.model = SentenceTransformer(model_name)
        self.dimensions = 384

    def get_embedding(self, text: str):
        return self.model.encode(text).tolist()

    def get_embedding_and_usage(self, text: str):
        return self.get_embedding(text), None

    # kept so nothing else calling .embed() directly breaks
    def embed(self, texts):
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(texts).tolist()

embedder = CustomEmbedder()

# ----- LanceDB Vector Store (Native Agno) -----
def get_vector_store():
    os.makedirs(VECTOR_DB_PATH, exist_ok=True)

    vector_store = LanceDb(
        table_name="schemes_knowledge",
        uri=VECTOR_DB_PATH,
        embedder=embedder,
        search_type=SearchType.vector,
    )
    return vector_store

# ----- Knowledge wrapper used ONLY for seeding -----
def get_knowledge():
    vector_store = get_vector_store()
    return Knowledge(vector_db=vector_store)

# ----- Seed function -----
def seed_knowledge_base():
    knowledge = get_knowledge()
    from db.mongo import get_collection
    schemes = list(get_collection("schemes").find({}, {"_id": 0}))

    for s in schemes:
        text = f"""
        Scheme Name: {s.get('name')}
        Description: {s.get('description')}
        Eligibility: {', '.join(s.get('eligibility', []))}
        Benefits: {s.get('benefits')}
        Target Groups: {', '.join(s.get('target_groups', []))}
        Category: {s.get('category')}
        """
        knowledge.add_content(
            text_content=text,
            metadata={"scheme_id": s.get('scheme_id')},
        )

    print(f"[LanceDB] Seeded {len(schemes)} scheme documents.")
    return knowledge