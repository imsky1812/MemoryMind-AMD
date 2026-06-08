# backend/rag.py
#
# LLM answer generation using either Groq or SambaNova.
# Both providers expose an OpenAI-compatible REST API, so we use the
# `openai` Python library with a custom base_url — no extra dependencies.
#
# Set in .env:
#   LLM_PROVIDER=groq         (or sambanova)
#   LLM_MODEL=llama-3.3-70b-versatile
#   GROQ_API_KEY=...
#   SAMBANOVA_API_KEY=...

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ─── Provider Configuration ───────────────────────────────────────────────────
PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower().strip()
MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

PROVIDER_CONFIGS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile",
    },
    "sambanova": {
        "base_url": "https://api.sambanova.ai/v1",
        "api_key_env": "SAMBANOVA_API_KEY",
        "default_model": "Meta-Llama-3.1-70B-Instruct",
    },
}

if PROVIDER not in PROVIDER_CONFIGS:
    raise ValueError(
        f"Unknown LLM_PROVIDER: '{PROVIDER}'. Choose 'groq' or 'sambanova'."
    )

config = PROVIDER_CONFIGS[PROVIDER]
api_key = os.getenv(config["api_key_env"])

if not api_key or api_key.startswith("your_"):
    raise RuntimeError(
        f"Missing {config['api_key_env']} in .env. "
        f"Get your key from: "
        f"{'https://console.groq.com' if PROVIDER == 'groq' else 'https://cloud.sambanova.ai'}"
    )

llm_client = OpenAI(
    base_url=config["base_url"],
    api_key=api_key,
)

print(f"[rag] Provider: {PROVIDER.upper()} | Model: {MODEL}")


# ─── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a personal memory assistant for a Second Brain app called MemoryMint.

Your job is to answer the user's question using ONLY the memory chunks provided below.

STRICT RULES:
1. Use ONLY information from the provided chunks. Never use outside knowledge.
2. After every factual claim, add a citation: [Source: filename, date]
3. If chunks don't contain enough information, respond EXACTLY with:
   "I couldn't find this in your memories. Try uploading more documents related to this topic."
4. Never make up information. Never fill gaps with general knowledge.
5. If the user asks when they saved something, always mention the exact date from metadata.
6. Keep answers concise — 3 to 5 sentences unless the user asks for detail.
7. End every answer with a "Sources used:" section listing each unique file referenced."""


# ─── Core Function ────────────────────────────────────────────────────────────

def generate_answer(query: str, chunks: list[dict]) -> dict:
    """
    Generate a cited RAG answer from retrieved chunks.

    Args:
        query:  The user's natural language question.
        chunks: List of dicts from similarity_search() — each has
                {text, source, date, type, score}.

    Returns:
        dict with keys: answer, sources, chunk_count, tokens_used, provider, model
    """
    if not chunks:
        return {
            "answer": "I couldn't find this in your memories. Try uploading more documents related to this topic.",
            "sources": [],
            "chunk_count": 0,
            "tokens_used": 0,
            "provider": PROVIDER,
            "model": MODEL,
        }

    # Build context block from retrieved chunks
    context = ""
    for i, chunk in enumerate(chunks):
        context += f"\n--- Memory {i + 1} ---\n"
        context += f"Source: {chunk['source']}\n"
        context += f"Date saved: {chunk['date']}\n"
        context += f"Relevance score: {chunk['score']}\n"
        context += f"Content: {chunk['text']}\n"

    user_message = f"MEMORY CHUNKS:\n{context}\n\nQUESTION: {query}"

    response = llm_client.chat.completions.create(
        model=MODEL,
        max_tokens=1024,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    answer_text = response.choices[0].message.content or ""
    tokens_used = 0
    if response.usage:
        tokens_used = (response.usage.prompt_tokens or 0) + (response.usage.completion_tokens or 0)

    return {
        "answer": answer_text,
        "sources": sorted({c["source"] for c in chunks}),
        "chunk_count": len(chunks),
        "tokens_used": tokens_used,
        "provider": PROVIDER,
        "model": MODEL,
    }
