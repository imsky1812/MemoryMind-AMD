# MemoryMint — Pay-per-Query AI Second Brain

> **AMD Developer Hackathon ACT II** | lablab.ai | Deadline: July 11, 2026

MemoryMint is a decentralised, pay-per-query AI second brain. Upload PDFs, text files, and notes to build a personal knowledge base, then query it with natural language. Every query is gated behind an **X402 micropayment** ($0.001 USDC on Base) — payable instantly by browser wallets or autonomously by AI agents. Brain owners can **publish their knowledge base publicly** and earn USDC every time someone queries it.

---

## How It Works

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                        BRAIN OWNER                              │
  │  1. Upload PDF / TXT  ──►  Free ingest + embedding              │
  │  2. Publish brain     ──►  Gets shareable /brain/{id} URL       │
  │  3. Earn USDC         ◄──  $0.001 per query from visitors       │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │
  ┌───────────────────────────────▼─────────────────────────────────┐
  │                       QUERIER (Human or AI Agent)               │
  │  1. Open /brain/{id}  ──►  See brain title, sources, stats      │
  │  2. Connect wallet    ──►  MetaMask / Coinbase Wallet           │
  │  3. Ask question      ──►  Wallet prompts $0.001 USDC approval  │
  │  4. Get answer        ◄──  RAG response with inline citations   │
  │                            + payment receipt badge + Basescan   │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │                    BACKEND PIPELINE                             │
  │                                                                 │
  │  ingest.py ──► embedder.py ──► Qdrant ──► X402 Gate ──► rag.py │
  │  (chunker)    (bge-small)    (vector)   (USDC check)  (LLM)    │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Embedding** | `BAAI/bge-small-en-v1.5` via sentence-transformers (CPU/GPU safe, 384-dim) |
| **Vector DB** | Qdrant (Docker) |
| **LLM** | Groq `llama-3.3-70b-versatile` or SambaNova `Meta-Llama-3.1-70B-Instruct` |
| **Backend** | FastAPI + Python 3.11 |
| **Payments** | X402 Protocol — Base Sepolia USDC micropayments, EIP-3009 transfer authorisations |
| **Frontend** | Next.js 16 App Router — TypeScript, Tailwind CSS v4, Wagmi v3 / Viem |
| **Wallets** | MetaMask (injected) + Coinbase Wallet browser extension |
| **SDK** | Python `memorymint` package — autonomous agent queries via CDP SDK |

---

## Project Structure

```
MemoryMint-AMD/
├── backend/
│   ├── main.py            # FastAPI app — all REST endpoints + X402 middleware
│   ├── ingest.py          # PDF / TXT chunker and text extractor
│   ├── embedder.py        # SentenceTransformers CPU/GPU embedder
│   ├── search.py          # Qdrant client — store, search, delete, collection info
│   ├── rag.py             # LLM connector (Groq / SambaNova) with strict citations
│   ├── payment.py         # X402 payment config loader
│   ├── public_brain.py    # Public brain registry (publish, unpublish, query count)
│   ├── earnings.py        # USDC earnings recorder and per-source analytics
│   └── agent_demo.py      # Autonomous EIP-3009 signing payment agent demo
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard (upload, chat, wallet)
│   │   ├── earnings/page.tsx           # Earnings analytics dashboard
│   │   └── brain/[public_id]/page.tsx  # Public brain portal (paid query page)
│   ├── components/
│   │   ├── WalletConnect.tsx    # Wallet dropdown (MetaMask + Coinbase)
│   │   ├── UploadZone.tsx       # Drag-and-drop file upload with progress
│   │   ├── SourceList.tsx       # Knowledge base file list with delete
│   │   ├── ChatWindow.tsx       # Chat UI with loading states and citations
│   │   ├── PublicBrainCard.tsx  # Publish / unpublish + share link card
│   │   ├── StatsBar.tsx         # Header stats (sources, queries, earned)
│   │   └── PaymentReceipt.tsx   # Per-message USDC receipt badge
│   ├── hooks/
│   │   └── useMemoryMint.ts     # Unified state hook (upload, query, sources)
│   ├── lib/
│   │   ├── api.ts               # Axios API client for all backend endpoints
│   │   ├── wagmi-config.ts      # Wagmi chain + connector configuration
│   │   └── x402-payment.ts     # Viem ERC-20 USDC transfer helper
│   └── types/index.ts           # Shared TypeScript type definitions
├── sdk/
│   ├── memorymint/
│   │   ├── __init__.py          # Package exports
│   │   └── client.py            # MemoryMintClient — agent-compatible query SDK
│   ├── setup.py                 # pip install configuration
│   └── README.md                # SDK usage guide
├── .env.example                 # Template for all environment variables
├── docker-compose.yml           # Qdrant local container
├── requirements.txt             # Python backend dependencies
├── setup_wallet.py              # CDP wallet creation utility
├── test_payment.py              # X402 payment flow test script
├── test_sdk.py                  # SDK integration test
└── changes.md                   # Architectural decision log
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Free | Server status, GPU info, payment config |
| `GET` | `/payment-info` | Free | X402 payment requirements for agents |
| `POST` | `/ingest` | Free | Upload and embed a PDF or TXT file |
| `POST` | `/query` | **$0.001 USDC** | Query your own brain with X-PAYMENT header |
| `GET` | `/sources/{user_id}` | Free | List all files in a user's brain |
| `DELETE` | `/sources/{user_id}/{name}` | Free | Remove a file from the brain |
| `POST` | `/brain/publish` | Free | Publish brain publicly and get share URL |
| `GET` | `/brain/{public_id}` | Free | Fetch public brain metadata and sources |
| `POST` | `/brain/{public_id}/query` | **$0.001 USDC** | Query a public brain (earns the owner) |
| `GET` | `/brain-by-owner/{user_id}` | Free | Fetch your own published brain |
| `DELETE` | `/brain/unpublish/{user_id}` | Free | Take brain offline |
| `GET` | `/brains` | Free | List all active public brains |
| `GET` | `/earnings/{user_id}` | Free | Full earnings history + per-source data |
| `GET` | `/earnings/{user_id}/summary` | Free | Lightweight earnings stats for header |

---

## Setup & Running

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker Desktop (running)
- [Groq API key](https://console.groq.com) — free tier works
- [CDP API Key](https://portal.cdp.coinbase.com) — for the autonomous agent and wallet setup

---

### 1. Configure Environment

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Required values in `.env`:

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `CDP_API_KEY_ID` | From downloaded CDP JSON key |
| `CDP_API_KEY_SECRET` | From downloaded CDP JSON key |
| `CDP_WALLET_SECRET` | Auto-filled by `setup_wallet.py` |
| `WALLET_ADDRESS` | Auto-filled by `setup_wallet.py` |
| `PAYMENT_NETWORK` | `eip155:84532` (Base Sepolia) |

Run the wallet setup utility **once** to generate your server wallet:

```bash
python setup_wallet.py
```

---

### 2. Start the Vector Database

```bash
docker compose up -d

# Verify Qdrant is running:
curl http://localhost:6333/healthz
```

---

### 3. Start the Backend

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

pip install -r requirements.txt

cd backend
uvicorn main:app --reload --port 8000
```

Open **[http://localhost:8000/docs](http://localhost:8000/docs)** to explore the Swagger UI.

---

### 4. Start the Frontend

```bash
cd frontend

# Create local env file
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
echo NEXT_PUBLIC_NETWORK=base-sepolia >> .env.local

# Install dependencies
npm install --legacy-peer-deps

# Build and start
npm run build
npm run start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### 5. Connect Your Wallet

You need a browser wallet extension on **Base Sepolia** testnet:

- **[MetaMask](https://metamask.io/download/)** — recommended
- **[Coinbase Wallet](https://www.coinbase.com/wallet/downloads)** — browser extension (not smart wallet)

Get free test USDC from **[faucet.circle.com](https://faucet.circle.com/)** → select Base Sepolia → paste your address.

---

## User Walkthrough

### Querying Your Own Brain

1. Open `http://localhost:3000` → click **Connect Wallet** in the top right
2. Drag a PDF or TXT file onto the upload zone in the left sidebar
3. Once uploaded, type a question in the chat input and press Enter
4. Approve the **$0.001 USDC** transaction in your wallet popup
5. The AI answer streams back with **inline source citations** and a **payment receipt badge** linking to Basescan

### Publishing Your Brain & Earning USDC

1. Connect your wallet on the dashboard
2. In the left sidebar under **Public Brain**, enter a title and description
3. Click **Publish Brain & Start Earning** — you get a shareable URL like `http://localhost:3000/brain/your-brain-id`
4. Share that URL with anyone — each time they query it, they pay $0.001 USDC straight to your wallet
5. Click **Earnings Dashboard** in the sidebar to see your total revenue, per-source breakdown, and live transaction feed

### Running the Autonomous Agent Demo

Test fully autonomous AI-to-AI payments (no browser required):

```bash
# With venv activated, from project root:
python backend/agent_demo.py
```

The agent discovers payment requirements, signs an EIP-3009 transfer authorisation with your CDP wallet, and fetches the RAG answer — all without human interaction.

### Using the Python SDK

```python
from memorymint import MemoryMintClient

client = MemoryMintClient(
    base_url="http://localhost:8000",
    cdp_api_key_id="your_key_id",
    cdp_api_key_secret="your_key_secret",
    cdp_wallet_secret="your_wallet_secret",
)

# Fetch public brain metadata (free)
brain = client.get_brain("your-brain-id")
print(brain.title, brain.source_count)

# Pay and query (costs $0.001 USDC per call)
result = client.query("your-brain-id", "What is the key idea in chapter 3?")
print(result.answer)
print(result.sources)
```

Install locally:

```bash
cd sdk
pip install -e .
python ../test_sdk.py
```

---

## Architecture Notes

| Decision | Rationale |
|---|---|
| `BAAI/bge-small-en-v1.5` (384-dim) instead of `bge-m3` (1024-dim) | Reduces RAM from ~3 GB to ~130 MB — critical for 8 GB RAM machines |
| Groq instead of Claude / GPT-4 | Zero-latency, high quality, free tier — no token cost during dev |
| `eip155:84532` CAIP-2 format for network | X402 facilitator requires CAIP-2; plain `base-sepolia` string is rejected |
| EIP-3009 off-chain signatures for agent | X402 exact scheme expects signed transfer authorisation, not raw tx hash |
| Coinbase Wallet `eoaOnly` preference | Avoids smart wallet popup window that popup blockers silently kill |

---

## Roadmap

| Week | Status | Deliverable |
|---|---|---|
| 1 | ✅ Done | RAG pipeline — PDF chunking, BGE embeddings, Qdrant, LLM citations |
| 2 | ✅ Done | X402 micropayment gate, EIP-3009 autonomous agent demo |
| 3 | ✅ Done | Next.js glassmorphic dashboard, wallet connect, paid chat, receipt badges |
| 4 | ✅ Done | Public brain sharing, earnings dashboard, Python agent SDK |
| 5 | 🔲 Planned | AMD Cloud VM deployment, GPU benchmarking, final video submission |

---

## Contributing

This project is a hackathon submission. For questions or issues, open a GitHub issue or reach out via the lablab.ai platform.
