# MemoryMint — AI Second Brain

> **AMD Developer Hackathon ACT II** | lablab.ai | Deadline: July 11, 2026

MemoryMint is a decentralized, pay-per-query AI Second Brain. Users can upload PDFs, notes, and WhatsApp exports to build a personalized knowledge graph and query it in natural language. To ensure sustainable indexing and compute cost allocation, each query is gated behind an **X402 micropayment** ($0.001 USDC on the Base network), payable autonomously by AI agents or manually by users using MetaMask or Coinbase Wallet.

---

## Architecture

```
                 +-----------------------+
                 |   PDF / TXT / MD File |
                 +-----------+-----------+
                             |
                             ▼ (Free Ingest)
                 +-----------+-----------+
                 |  ingest.py (Chunker)  |
                 +-----------+-----------+
                             |
                             ▼
                 +-----------+-----------+
                 |  embedder.py (Model)  | <--- BAAI/bge-small-en-v1.5
                 +-----------+-----------+
                             |
                             ▼
                 +-----------+-----------+
                 |  search.py (Qdrant)  |
                 +-----------+-----------+
                             |
                             ▼ (USDC Gated /query)
                 +-----------+-----------+
                 |   X402 Payment Gate   | <--- eip155:84532 (Base Sepolia)
                 +-----------+-----------+
                             | (Verify Tx)
                             ▼
                 +-----------+-----------+
                 |      rag.py (LLM)     | <--- Groq / SambaNova
                 +-----------+-----------+
                             |
                             ▼
                 +-----------+-----------+
                 |   Next.js Dashboard   | <--- MetaMask / Coinbase Wallet
                 +-----------------------+
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Embedding** | `BAAI/bge-small-en-v1.5` via sentence-transformers (optimized for CPU/GPU memory safety) |
| **Vector DB** | Qdrant (Docker Container) |
| **LLM** | Groq `llama-3.3-70b-versatile` or SambaNova `Meta-Llama-3.1-70B-Instruct` |
| **Backend** | FastAPI + Python 3.11+ |
| **Payments (Week 2)** | X402 Protocol (Base Sepolia USDC micropayments, CDP SDK EIP-3009 transfer authorizations) |
| **Frontend (Week 3)** | Next.js 16 App Router (TypeScript, Tailwind CSS v4, Wagmi/Viem Web3 connectors) |

---

## Project Structure

```
memorymint/
├── backend/
│   ├── main.py         # FastAPI App (ingest + query + health + payment-info)
│   ├── ingest.py       # PDF/TXT/MD Chunker and text extractor
│   ├── embedder.py     # SentenceTransformers CPU/GPU Embedder
│   ├── search.py       # Qdrant client, similarity searches, and collection deletes
│   ├── rag.py          # LLM connection (Groq/SambaNova) with strict citations
│   ├── payment.py      # X402 payment specifications configuration
│   └── agent_demo.py   # Autonomous EIP-3009 signing payment agent demo
├── frontend/
│   ├── app/            # Next.js layout, providers, and dashboard page
│   ├── components/     # WalletConnect, UploadZone, SourceList, ChatWindow, StatsBar, PaymentReceipt
│   ├── hooks/          # useMemoryMint unified state hook
│   ├── lib/            # api Axios clients, wagmi configs, x402-payment Viem helpers
│   └── types/          # Shared TypeScript type definitions
├── .env                # Root environment file (Groq API, Qdrant, CDP Wallet secrets)
├── setup_wallet.py     # CDP Wallet creation utility script
└── docker-compose.yml  # Docker compose config for local Qdrant
```

---

## Setup & Running Guide

### 1. Prerequisites
* Python 3.11+
* Node.js 18+ (with npm)
* Docker Desktop (running)
* Groq API key: [console.groq.com](https://console.groq.com)
* Coinbase Developer Platform (CDP) API Key: [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)

### 2. Configure Environment `.env`
Copy `.env.example` in the root folder to `.env`:
```bash
cp .env.example .env
```
Fill in the parameters:
* `GROQ_API_KEY`: Your Groq API developer key.
* `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`: Loaded from your downloaded CDP API key JSON.
* Run the wallet creation utility to generate the server's wallet and address:
  ```bash
  python setup_wallet.py
  ```
  Copy the printed `CDP_WALLET_SECRET` and `WALLET_ADDRESS` values back into your `.env`.

---

### 3. Running the Backend Services

#### A. Start the Vector Database (Qdrant)
Run Qdrant in Docker:
```bash
docker compose up -d
# Verify it is listening on localhost:6333:
curl http://localhost:6333/healthz
```

#### B. Start the Python API Server
Initialize your virtual environment, install dependencies, and run the FastAPI server:
```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

# Run the backend (defaulting to port 8000)
cd backend
uvicorn main:app --reload --port 8000
```
Open **http://localhost:8000/docs** to verify Swagger REST documentation.

#### C. Run the Autonomous AI Payment Agent Demo
To test autonomous agent-to-agent payment verification:
```bash
# Verify you have testnet USDC on Base Sepolia inside your CDP Wallet (faucet: https://faucet.circle.com)
python backend/agent_demo.py
```

---

### 4. Running the Next.js Frontend Dashboard

Navigate to the frontend folder, create environment configurations, install dependencies, and launch:

```bash
cd frontend

# Set up local Next.js env (pointing to backend port 8000 and base-sepolia)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_NETWORK=base-sepolia" >> .env.local

# Install dependencies (use legacy-peer-deps to avoid wagmi version conflicts)
npm install --legacy-peer-deps

# Build the optimized production bundle
npm run build

# Start the dashboard server (defaulting to port 3000)
npm run start
```
Open **`http://localhost:3000`** in your browser to access the dashboard.

---

## Step-by-Step UI Verification Flow
1. Open **`http://localhost:3000`** and select **Connect Wallet** in the top right. Connect MetaMask or Coinbase Wallet.
2. Check that the header updates to show your truncated address and a **green pulsing status indicator**.
3. Drag a PDF or TXT file onto the dashed upload zone in the left panel. Confirm the progress bar fills and raises a `"chunks stored"` success notification.
4. Click on the file in the sidebar list if you wish to **filter queries to that source only** (indicated by an active blue border and tag).
5. Type a question in the chat input and press enter.
6. Approve the **$0.001 USDC** transfer transaction in the MetaMask wallet popup.
7. Once confirmed on-chain, watch the RAG answer stream in with **inline citations** and an absolute **green payment receipt badge** linking directly to the Sepolia Basescan explorer!

---

## Roadmap

| Week | Status | Focus |
|---|---|---|
| 1 | ✅ Done | Core RAG pipeline (PDF parsing, embeddings, Qdrant search, LLM citations) |
| 2 | ✅ Done | X402 payment gate middleware, autonomous signature recovery client |
| 3 | ✅ Done | Next.js single-page glassmorphic UI, Web3 wallet connectors, paid chat, and badge receipts |
| 4 | Planned | Public brain sharing links, earnings metadata dashboard, Python client SDK |
| 5 | Planned | VM deployment on AMD Developer Cloud, benchmarking, final video submission |
