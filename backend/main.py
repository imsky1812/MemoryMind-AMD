# backend/main.py
#
# MemoryMint FastAPI backend — Week 1
# Designed for extensibility: Week 2 adds X402Middleware without restructuring.

import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from ingest import ingest_file
from embedder import embed_chunks, DEVICE, GPU_NAME, VECTOR_SIZE
from search import store_chunks, similarity_search, list_sources, delete_source, get_collection_info
from rag import generate_answer, PROVIDER, MODEL

load_dotenv()

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MemoryMint API",
    description=(
        "Pay-per-query AI Second Brain — AMD Hackathon ACT II\n\n"
        "**Week 1**: Core ingestion + RAG pipeline\n"
        "**Week 2**: X402 micropayment gate on /query\n"
        "**Week 3**: Next.js frontend\n"
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Week 3: restrict to frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    """Liveness check. Also returns hardware and LLM provider info."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "week": 1,
        "embedding": {
            "model": "BAAI/bge-m3",
            "device": DEVICE,
            "gpu": GPU_NAME,
            "vector_size": VECTOR_SIZE,
        },
        "llm": {
            "provider": PROVIDER,
            "model": MODEL,
        },
    }


# ─── Ingest ───────────────────────────────────────────────────────────────────

@app.post("/ingest", tags=["Knowledge"])
async def ingest_document(
    file: UploadFile = File(..., description="PDF or TXT file to ingest"),
    user_id: str = Form(..., description="Unique user identifier"),
):
    """
    Upload a PDF or TXT file and embed it into the user's brain.

    - Extracts text (pdfplumber for PDF, regex parser for WhatsApp TXT)
    - Chunks into 300-char overlapping windows
    - Embeds with bge-m3 (ROCm GPU if available, CPU otherwise)
    - Stores in user's isolated Qdrant collection

    Week 3 addition: /ingest/url for URL scraping.
    """
    allowed_extensions = {".pdf", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{ext}'. Allowed: {sorted(allowed_extensions)}",
        )

    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id cannot be empty")

    # Save upload to a temp file (FastAPI streams uploads)
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Ingest → embed → store pipeline
        chunks = ingest_file(tmp_path, file.filename or "upload")

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not extract any text from the file. "
                    "If it's a PDF, it may be a scanned image (OCR not supported yet)."
                ),
            )

        chunks = embed_chunks(chunks)
        count = store_chunks(user_id, chunks)

        return {
            "status": "ok",
            "filename": file.filename,
            "user_id": user_id,
            "chunks_stored": count,
            "embedding_device": DEVICE,
        }

    finally:
        os.unlink(tmp_path)


# ─── Query ────────────────────────────────────────────────────────────────────
#
# NOTE FOR WEEK 2:
# Insert X402Middleware registration BEFORE this route definition:
#
#   from payment import X402Middleware
#   app.add_middleware(X402Middleware, routes=[{
#       "path": "/query",
#       "price": "0.001",           # $0.001 USDC per query
#       "currency": "USDC",
#       "network": "base",
#       "address": os.getenv("WALLET_ADDRESS"),
#   }])
#
# The endpoint body below stays unchanged — middleware handles payment before
# reaching it. If payment fails → 402 response is returned automatically.

@app.post("/query", tags=["Knowledge"])
async def query_brain(
    user_id: str = Form(..., description="Unique user identifier"),
    question: str = Form(..., description="Natural language question"),
    top_k: int = Form(default=5, ge=1, le=20, description="Number of chunks to retrieve"),
    source_filter: str | None = Form(default=None, description="Optional: limit to one source file"),
):
    """
    Query the user's brain. Returns a cited LLM answer.

    - Embeds the question with bge-m3
    - Retrieves top-k similar chunks from Qdrant
    - Sends chunks + question to LLM (Groq or SambaNova)
    - Returns answer with [Source: ...] citations

    Week 2: requires X402 payment header ($0.001 USDC per query).
    """
    if not question.strip():
        raise HTTPException(status_code=400, detail="question cannot be empty")

    chunks = similarity_search(
        user_id=user_id,
        query=question,
        top_k=top_k,
        source_filter=source_filter,
    )

    result = generate_answer(question, chunks)

    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
        "chunks_used": result["chunk_count"],
        "tokens_used": result["tokens_used"],
        "user_id": user_id,
        "llm_provider": result["provider"],
        "llm_model": result["model"],
    }


# ─── Sources ──────────────────────────────────────────────────────────────────

@app.get("/sources/{user_id}", tags=["Knowledge"])
async def get_sources(user_id: str):
    """List all source files stored in the user's brain."""
    sources = list_sources(user_id)
    info = get_collection_info(user_id)
    return {
        "user_id": user_id,
        "sources": sources,
        "count": len(sources),
        "total_vectors": info.get("vectors_count", 0),
    }


@app.delete("/sources/{user_id}/{source_name}", tags=["Knowledge"])
async def remove_source(user_id: str, source_name: str):
    """Delete all chunks from a specific source file."""
    deleted = delete_source(user_id, source_name)
    return {
        "status": "deleted",
        "source": source_name,
        "user_id": user_id,
        "chunks_deleted": deleted,
    }


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
