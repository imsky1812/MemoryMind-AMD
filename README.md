# MemoryMint — AI Second Brain

> **AMD Developer Hackathon ACT II** | lablab.ai | Deadline: July 11, 2026

Pay-per-query AI Second Brain. Upload PDFs, notes, WhatsApp exports → query in natural language → get cited answers. Every query is gated behind X402 micropayments (Week 2).

---

## Architecture

```
PDF / TXT
    │
    ▼
ingest.py  ── pdfplumber + chunker (300 chars / 50 overlap)
    │
    ▼
embedder.py ── BAAI/bge-m3 on AMD MI300X (ROCm) or CPU
    │
    ▼
search.py  ── Qdrant (per-user collections, cosine similarity)
    │
    ▼
rag.py     ── Groq / SambaNova LLM with strict citation prompting
    │
    ▼
main.py    ── FastAPI REST API
```

## Tech Stack

| Layer | Technology |
|---|---|
| Embedding | `BAAI/bge-m3` via sentence-transformers |
| GPU Compute | AMD MI300X on AMD Developer Cloud (ROCm) |
| Vector DB | Qdrant (Docker) |
| LLM | Groq `llama-3.1-70b-versatile` or SambaNova `Meta-Llama-3.1-70B-Instruct` |
| Backend | FastAPI + Python 3.11+ |
| Payments (Week 2) | X402 Protocol (USDC on Base chain) |
| Frontend (Week 3) | Next.js 14 App Router |

---

## Week 1 Setup

### 1. Prerequisites

- Python 3.11+
- Docker Desktop (running)
- Groq API key: [console.groq.com](https://console.groq.com) (free tier available)
  - OR SambaNova API key: [cloud.sambanova.ai](https://cloud.sambanova.ai)

### 2. Clone & Configure

```bash
# Copy env template and fill in your key
cp .env.example .env
# Edit .env: set LLM_PROVIDER=groq, GROQ_API_KEY=your_key
```

### 3. Start Qdrant

```bash
docker compose up -d
# Verify:
curl http://localhost:6333/healthz
# Expected: {"title":"qdrant - vector search engine","version":"..."}
```

### 4. Install Python dependencies

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
```

> **On AMD MI300X (ROCm):** Replace the torch line with:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.1
> pip install -r requirements.txt
> ```

### 5. Start the API

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for interactive Swagger UI.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check + GPU/LLM info |
| `POST` | `/ingest` | Upload PDF or TXT file |
| `POST` | `/query` | Natural language query → cited answer |
| `GET` | `/sources/{user_id}` | List uploaded files |
| `DELETE` | `/sources/{user_id}/{source}` | Remove a source |

### Test commands

```bash
# Health check
curl http://localhost:8000/health

# Ingest a PDF
curl -X POST http://localhost:8000/ingest \
  -F "file=@/path/to/your/document.pdf" \
  -F "user_id=sarvesh_001"

# Query your brain
curl -X POST http://localhost:8000/query \
  -F "user_id=sarvesh_001" \
  -F "question=What is this document about?"

# List sources
curl http://localhost:8000/sources/sarvesh_001

# Delete a source
curl -X DELETE http://localhost:8000/sources/sarvesh_001/document.pdf
```

---

## AMD GPU Benchmark

```bash
# After activating venv, from project root:
python backend/embedder.py
```

Screenshot the output for your hackathon demo video.

---

## Week 1 Checklist

- [ ] Qdrant running: `curl http://localhost:6333/healthz` returns ok
- [ ] `POST /ingest` returns `chunks_stored > 0`
- [ ] `POST /query` returns answer with `[Source: ...]` citations
- [ ] `GET /sources/{user_id}` lists uploaded files
- [ ] AMD VM: `torch.cuda.is_available()` returns `True`
- [ ] AMD VM: benchmark screenshot saved
- [ ] 60-second screen recording saved (rocm-smi + ingest + query)

---

## Roadmap

| Week | Focus |
|---|---|
| ✅ 1 | Core RAG pipeline (this) |
| 2 | X402 payment gate on `/query` + agent demo script |
| 3 | Next.js frontend — upload UI, chat, wallet connect |
| 4 | Public brain sharing, earnings dashboard, Python SDK |
| 5 | Demo video, submission polish, deploy on AMD Developer Cloud |
