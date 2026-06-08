# backend/embedder.py

import torch
from sentence_transformers import SentenceTransformer

# ─── Device Detection ──────────────────────────────────────────────────────────
# On AMD MI300X with ROCm: torch.cuda.is_available() returns True (ROCm exposes
# itself as CUDA-compatible). On local dev: falls back to CPU automatically.
if torch.cuda.is_available():
    DEVICE = "cuda"
    GPU_NAME = torch.cuda.get_device_name(0)
    print(f"[embedder] Running on GPU: {GPU_NAME}")
else:
    DEVICE = "cpu"
    GPU_NAME = "CPU"
    print("[embedder] Running on CPU (no GPU detected - normal for local dev)")

# ─── Model Load ───────────────────────────────────────────────────────────────
# bge-m3: 1024-dim vectors, multilingual, best open-source embedding model.
# First run downloads ~2.2 GB from HuggingFace — cached locally after that.
print(f"[embedder] Loading BAAI/bge-m3 on {DEVICE}...")
model = SentenceTransformer("BAAI/bge-m3", device=DEVICE)
VECTOR_SIZE = 1024  # bge-m3 output dimension

print(f"[embedder] Model ready. Vector size: {VECTOR_SIZE}")


def embed_chunks(chunks: list[dict]) -> list[dict]:
    """
    Embed a list of chunk dicts. Adds 'vector' key (list[float]) to each chunk.
    Uses batch_size=64 on GPU, 8 on CPU for memory safety.
    Modifies chunks in-place AND returns them for chaining.
    """
    if not chunks:
        return []

    texts = [c["text"] for c in chunks]
    batch_size = 64 if DEVICE == "cuda" else 8

    vectors = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 20,
        normalize_embeddings=True,   # required for cosine similarity in Qdrant
    )

    for i, chunk in enumerate(chunks):
        chunk["vector"] = vectors[i].tolist()

    return chunks


def embed_single(text: str) -> list[float]:
    """
    Embed a single query string. Used at search time.
    Always normalize so cosine similarity is accurate.
    """
    vector = model.encode(
        [text],
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return vector[0].tolist()


def benchmark():
    """
    Throughput benchmark. Run this on AMD VM and screenshot for the demo video.
    Usage: python backend/embedder.py
    """
    import time

    print("\n" + "=" * 50)
    print("MemoryMint - AMD GPU Embedding Benchmark")
    print("=" * 50)

    # 100 realistic document chunks
    test_texts = [
        "This is a sample knowledge chunk from a PDF document, "
        "representative of typical Second Brain content. " * 3
    ] * 100

    batch = 64 if DEVICE == "cuda" else 8

    # Warm-up pass (important for accurate GPU timing)
    model.encode(test_texts[:5], batch_size=batch)

    t0 = time.perf_counter()
    model.encode(test_texts, batch_size=batch, normalize_embeddings=True)
    elapsed = time.perf_counter() - t0

    print(f"\nDevice:     {DEVICE} ({GPU_NAME})")
    print(f"Chunks:     {len(test_texts)}")
    print(f"Time:       {elapsed:.2f}s")
    print(f"Throughput: {len(test_texts) / elapsed:.1f} chunks/sec")
    print(f"Vector dim: {VECTOR_SIZE}")
    print("\n>>> Screenshot this output for your demo video! <<<")
    print("=" * 50)


if __name__ == "__main__":
    benchmark()
