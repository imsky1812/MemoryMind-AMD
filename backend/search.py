# backend/search.py

import uuid
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from embedder import embed_single, VECTOR_SIZE

load_dotenv()

# ─── Qdrant Client ────────────────────────────────────────────────────────────
client = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", 6333)),
)


# ─── Collection Helpers ───────────────────────────────────────────────────────

def _collection_name(user_id: str) -> str:
    """Each user gets their own isolated Qdrant collection."""
    return f"brain_{user_id}"


def ensure_collection(user_id: str) -> str:
    """Create collection if it doesn't exist or has mismatched dimensions. Returns collection name."""
    col = _collection_name(user_id)
    recreate = False
    if client.collection_exists(col):
        try:
            info = client.get_collection(col)
            vectors_config = info.config.params.vectors
            if hasattr(vectors_config, "size"):
                current_size = vectors_config.size
            elif isinstance(vectors_config, dict):
                # If named vectors, get the first one's size
                current_size = list(vectors_config.values())[0].size
            else:
                current_size = None

            if current_size is not None and current_size != VECTOR_SIZE:
                print(f"[search] Collection '{col}' has vector size {current_size}, but model requires {VECTOR_SIZE}. Recreating collection...")
                client.delete_collection(col)
                recreate = True
        except Exception as e:
            print(f"[search] Error checking collection '{col}': {e}. Recreating to be safe.")
            try:
                client.delete_collection(col)
            except Exception:
                pass
            recreate = True
    else:
        recreate = True

    if recreate:
        client.create_collection(
            collection_name=col,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        print(f"[search] Created collection: '{col}' with vector size: {VECTOR_SIZE}")
    return col


# ─── Write ────────────────────────────────────────────────────────────────────

def store_chunks(user_id: str, chunks: list[dict]) -> int:
    """
    Upsert embedded chunks into user's Qdrant collection.
    Each chunk must have 'vector' and 'metadata' keys (set by embedder).
    Returns number of points stored.
    """
    col = ensure_collection(user_id)

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=c["vector"],
            payload={
                "text": c["text"],
                **c["metadata"],
            },
        )
        for c in chunks
        if "vector" in c
    ]

    if not points:
        return 0

    client.upsert(collection_name=col, points=points)
    print(f"[search] Stored {len(points)} chunks for user '{user_id}'")
    return len(points)


# ─── Read ─────────────────────────────────────────────────────────────────────

def similarity_search(
    user_id: str,
    query: str,
    top_k: int = 5,
    score_threshold: float = 0.45,
    source_filter: str | None = None,
) -> list[dict]:
    """
    Embed the query and search user's collection for similar chunks.
    Returns ranked list of {text, source, date, type, score}.

    score_threshold=0.45 is intentionally permissive — lets Claude judge
    relevance rather than filtering out borderline matches.
    """
    col = _collection_name(user_id)
    if not client.collection_exists(col):
        return []

    query_vector = embed_single(query)

    query_filter = None
    if source_filter:
        query_filter = Filter(
            must=[FieldCondition(key="source", match=MatchValue(value=source_filter))]
        )

    response = client.query_points(
        collection_name=col,
        query=query_vector,
        limit=top_k,
        score_threshold=score_threshold,
        query_filter=query_filter,
        with_payload=True,
    )

    return [
        {
            "text": r.payload.get("text", ""),
            "source": r.payload.get("source", "unknown"),
            "date": r.payload.get("date", ""),
            "type": r.payload.get("type", ""),
            "chunk_index": r.payload.get("chunk_index", 0),
            "score": round(r.score, 3),
        }
        for r in response.points
    ]


def get_collection_info(user_id: str) -> dict:
    """Return stats about user's collection (total vectors, etc.)."""
    col = _collection_name(user_id)
    if not client.collection_exists(col):
        return {"exists": False, "vectors_count": 0}
    info = client.get_collection(col)
    return {
        "exists": True,
        "vectors_count": info.points_count,
        "collection_name": col,
    }


def list_sources(user_id: str) -> list[str]:
    """Return distinct source filenames in user's collection."""
    col = _collection_name(user_id)
    if not client.collection_exists(col):
        return []

    results, _ = client.scroll(
        collection_name=col,
        limit=1000,
        with_payload=["source"],
        with_vectors=False,
    )

    sources = list({r.payload.get("source", "") for r in results})
    return sorted(s for s in sources if s)


def delete_source(user_id: str, source_name: str) -> int:
    """
    Delete all chunks from a specific source file.
    Returns number of points deleted (approximate via collection diff).
    """
    col = _collection_name(user_id)
    if not client.collection_exists(col):
        return 0

    before = client.get_collection(col).points_count or 0

    client.delete(
        collection_name=col,
        points_selector=Filter(
            must=[FieldCondition(key="source", match=MatchValue(value=source_name))]
        ),
    )

    after = client.get_collection(col).points_count or 0
    deleted = before - after
    print(f"[search] Deleted ~{deleted} chunks for source '{source_name}'")
    return deleted
