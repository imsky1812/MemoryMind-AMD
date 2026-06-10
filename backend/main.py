# backend/main.py
#
# MemoryMint FastAPI backend — Week 2
# Added: X402 payment middleware, /payment-info endpoint, payment metadata in /query response

import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from ingest import ingest_file
from embedder import embed_chunks, DEVICE, GPU_NAME, VECTOR_SIZE, EMBEDDING_MODEL_NAME
from search import store_chunks, similarity_search, list_sources, delete_source, get_collection_info
from rag import generate_answer, PROVIDER, MODEL
from payment import get_payment_config, format_402_response
from public_brain import (
    publish_brain, get_brain_by_public_id, get_brain_by_owner,
    unpublish_brain, increment_query_count, list_all_brains
)
from earnings import record_payment, get_earnings, get_earnings_summary

load_dotenv()

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MemoryMint API",
    description=(
        "Pay-per-query AI Second Brain — AMD Hackathon ACT II\n\n"
        "**Week 2**: X402 micropayment gate on /query\n"
        "Every query costs $0.001 USDC on Base. AI agents pay autonomously.\n\n"
        "**Week 1**: Core ingestion + RAG pipeline\n"
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-PAYMENT", "X-PAYMENT-RESPONSE"],
    expose_headers=["X-PAYMENT-RESPONSE"],
)


# ─── X402 Payment Middleware ──────────────────────────────────────────────────
#
# Wraps /query only. /ingest stays free.
# If x402 package or wallet address is missing, server still starts —
# /query will work unprotected with a warning in logs.

try:
    from x402 import x402ResourceServer
    from x402.http import HTTPFacilitatorClient
    from x402.http.middleware import fastapi_payment_middleware
    from x402.mechanisms.evm.exact import ExactEvmServerScheme

    payment_config = get_payment_config()

    if not payment_config["payTo"]:
        raise ValueError("WALLET_ADDRESS is not set in .env")

    # Initialize client and resource server
    facilitator = HTTPFacilitatorClient({"url": "https://x402.org/facilitator"})
    server = x402ResourceServer(facilitator)

    # Register the exact payment scheme for Base Sepolia (eip155:84532 or base-sepolia)
    scheme = ExactEvmServerScheme()
    server.register("base-sepolia", scheme)
    server.register("eip155:84532", scheme)

    # Configure the protected route
    routes = {
        "POST /query": {
            "accepts": {
                "scheme": "exact",
                "payTo": payment_config["payTo"],
                "price": f"${payment_config['maxAmountRequired']}",
                "network": payment_config["network"],
            }
        }
    }

    # Add ASGI middleware using FastAPI decorator
    @app.middleware("http")
    async def x402_middleware(request, call_next):
        # We protect /query path and public query paths
        if request.url.path == "/query":
            return await fastapi_payment_middleware(routes, server)(request, call_next)
        elif request.url.path.startswith("/brain/") and request.url.path.endswith("/query"):
            # Construct a dynamic routes dictionary for this specific path!
            dynamic_routes = {
                f"POST {request.url.path}": {
                    "accepts": {
                        "scheme": "exact",
                        "payTo": payment_config["payTo"],
                        "price": f"${payment_config['maxAmountRequired']}",
                        "network": payment_config["network"],
                    }
                }
            }
            return await fastapi_payment_middleware(dynamic_routes, server)(request, call_next)
        return await call_next(request)

    print(f"[payment] X402 middleware active - ${payment_config['maxAmountRequired']} USDC per /query on {payment_config['network']}")

except ImportError:
    print("[payment] WARNING: x402 package not installed. /query is unprotected.")
    print("[payment] Run: pip install x402")
except Exception as e:
    print(f"[payment] WARNING: X402 middleware failed to load: {e}")
    print("[payment] /query is running unprotected. Check WALLET_ADDRESS in .env.")


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    """Liveness check. Returns hardware, LLM provider, and payment config info."""
    config = get_payment_config()
    return {
        "status": "ok",
        "version": "0.2.0",
        "week": 2,
        "embedding": {
            "model": EMBEDDING_MODEL_NAME,
            "device": DEVICE,
            "gpu": GPU_NAME,
            "vector_size": VECTOR_SIZE,
        },
        "llm": {
            "provider": PROVIDER,
            "model": MODEL,
        },
        "payment": {
            "enabled": bool(config["payTo"]),
            "price": config["maxAmountRequired"],
            "asset": config["asset"],
            "network": config["network"],
            "payTo": config["payTo"],
        },
    }


# ─── Payment Info (public) ────────────────────────────────────────────────────

@app.get("/payment-info", tags=["Payment"])
async def payment_info():
    """
    Returns X402 payment requirements for /query.
    AI agents call this first to discover how much to pay and where.
    No authentication required.
    """
    return {
        "endpoint": "/query",
        "method": "POST",
        "payment_required": format_402_response(),
        "instructions": (
            "Include X-PAYMENT header with Base USDC payment proof. "
            "Use X402 protocol: pay on Base chain, attach transaction proof as header."
        ),
    }


# ─── Ingest (free — no payment required) ─────────────────────────────────────

@app.post("/ingest", tags=["Knowledge"])
async def ingest_document(
    file: UploadFile = File(..., description="PDF or TXT file to ingest"),
    user_id: str = Form(..., description="Unique user identifier"),
):
    """
    Upload a PDF or TXT file and embed it into the user's brain.
    Free — no payment required. Users should not pay to upload their own data.
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

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        tmp.write(content)
        tmp_path = tmp.name

    try:
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


# ─── Query (X402 payment required) ───────────────────────────────────────────
#
# X402Middleware intercepts requests to this path.
# Without valid X-PAYMENT header → middleware returns HTTP 402 automatically.
# With valid payment → middleware verifies via x402.org/facilitator, then
# this function executes normally.

@app.post("/query", tags=["Knowledge"])
async def query_brain(
    request: Request,
    user_id: str = Form(..., description="Unique user identifier"),
    question: str = Form(..., description="Natural language question"),
    top_k: int = Form(default=5, ge=1, le=20, description="Number of chunks to retrieve"),
    source_filter: str | None = Form(default=None, description="Optional: limit to one source file"),
):
    """
    Query the user's brain. Requires $0.001 USDC payment via X402.

    Without X-PAYMENT header: X402Middleware returns HTTP 402 with payment details.
    With valid X-PAYMENT header: Payment verified, this function runs, returns cited answer.

    AI agents can pay autonomously using CDP SDK — see agent_demo.py.
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
    config = get_payment_config()

    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
        "chunks_used": result["chunk_count"],
        "tokens_used": result["tokens_used"],
        "user_id": user_id,
        "llm_provider": result["provider"],
        "llm_model": result["model"],
        "payment": {
            "amount": config["maxAmountRequired"],
            "asset": config["asset"],
            "network": config["network"],
            "verified": True,
        },
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


# ─── Public Brain endpoints ──────────────────────────────────────────────────

from pydantic import BaseModel

class PublishBrainRequest(BaseModel):
    user_id: str
    title: str
    description: str = ""


@app.post("/brain/publish")
async def publish_brain_endpoint(req: PublishBrainRequest):
    """
    Publish a user's brain publicly.
    Creates a shareable URL: /brain/{public_id}
    Brain owner earns USDC when others query their public brain.
    """
    brain = publish_brain(
        owner_user_id=req.user_id,
        title=req.title,
        description=req.description,
    )
    return {
        "status": "published",
        "public_id": brain["public_id"],
        "share_url": f"/brain/{brain['public_id']}",
        "brain": brain,
    }


@app.get("/brain/{public_id}")
async def get_public_brain(public_id: str):
    """
    Fetch metadata for a public brain.
    Used by the /brain/[public_id] frontend page to show title, description, source count.
    Does NOT require payment — just metadata.
    """
    brain = get_brain_by_public_id(public_id)
    if not brain:
        raise HTTPException(status_code=404, detail="Brain not found or not published")

    # Get source count for this brain's owner
    sources = list_sources(brain["owner_user_id"])
    return {
        **brain,
        "source_count": len(sources),
        "sources_preview": sources[:3],  # show first 3 source names (not content)
    }


@app.post("/brain/{public_id}/query")
async def query_public_brain_endpoint(
    request: Request,
    public_id: str,
    question: str = Form(...),
    querier_user_id: str = Form(...),
):
    """
    Query a PUBLIC brain. Querier pays $0.001 USDC — brain owner earns it.
    X402 middleware gates this endpoint same as /query.

    querier_user_id: wallet-derived ID of whoever is asking
    The brain owner's user_id is looked up from the public_id registry.

    IMPORTANT: search runs against the OWNER's Qdrant collection,
    not the querier's. This is what makes public brains work.
    """
    brain = get_brain_by_public_id(public_id)
    if not brain:
        raise HTTPException(status_code=404, detail="Brain not found or not published")

    # Search the OWNER's collection (not querier's)
    owner_user_id = brain["owner_user_id"]
    chunks = similarity_search(owner_user_id, question, top_k=5)
    result = generate_answer(question, chunks)

    # Record the payment and increment query count
    payment_header = request.headers.get("X-PAYMENT", "")
    record_payment(
        owner_user_id=owner_user_id,
        querier_user_id=querier_user_id,
        question=question,
        sources_queried=result["sources"],
        amount_usdc="0.001",
        tx_hash=payment_header[:66] if payment_header.startswith("0x") else "",
        public_id=public_id,
    )
    increment_query_count(public_id, "0.001")

    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
        "chunks_used": result["chunk_count"],
        "brain_title": brain["title"],
        "owner": owner_user_id,
        "payment": {
            "amount": "0.001",
            "asset": "USDC",
            "network": get_payment_config()["network"],
            "verified": True,
        },
    }


@app.get("/brain-by-owner/{user_id}")
async def get_brain_by_owner_endpoint(user_id: str):
    """
    Get the public brain published by a specific user.
    Frontend uses this to show "Your published brain" card on the dashboard.
    Returns 404 if user hasn't published a brain yet.
    """
    brain = get_brain_by_owner(user_id)
    if not brain:
        raise HTTPException(status_code=404, detail="No published brain for this user")
    sources = list_sources(brain["owner_user_id"])
    return {**brain, "source_count": len(sources)}


@app.delete("/brain/unpublish/{user_id}")
async def unpublish_brain_endpoint(user_id: str):
    """Take a brain offline. Sources stay in Qdrant but public page returns 404."""
    success = unpublish_brain(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="No brain found for this user")
    return {"status": "unpublished"}


@app.get("/brains")
async def list_brains():
    """List all active public brains — future discovery page."""
    return {"brains": list_all_brains(active_only=True)}


# ─── Earnings endpoints ───────────────────────────────────────────────────────

@app.get("/earnings/{user_id}")
async def get_earnings_endpoint(user_id: str):
    """
    Full earnings data for a user.
    Shows: total USDC earned, query count, per-source breakdown, transaction history.
    Frontend /earnings page fetches this.
    """
    return get_earnings(user_id)


@app.get("/earnings/{user_id}/summary")
async def get_earnings_summary_endpoint(user_id: str):
    """
    Lightweight earnings summary.
    Used by the dashboard stats bar to show "Earned: $0.012 USDC" without heavy data.
    """
    return get_earnings_summary(user_id)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
