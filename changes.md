# MemoryMint — Configuration and Model Changes

This document lists the architectural and configuration adjustments made to the MemoryMint codebase during local development to support low-RAM hosting and resolve payment integration issues.

## 1. LLM Provider (Groq instead of Claude)
* **Change:** Configured the application to use **Groq** (`llama-3.3-70b-versatile`) as the LLM provider instead of Anthropic's **Claude**.
* **Rationale:** Allows fast, high-quality, and cost-effective generation for RAG queries without hitting high latencies or API key limitations during dev.
* **Implementation:** Controlled dynamically via the `LLM_PROVIDER` and `LLM_MODEL` environment variables in `.env`.

## 2. Embedding Model (BGE Small instead of BGE M3)
* **Change:** Configured the local embedding model to `BAAI/bge-small-en-v1.5` (384 dimensions, ~130MB RAM) instead of the default `BAAI/bge-m3` (1024 dimensions, ~2.2GB on disk, ~3-4GB RAM).
* **Rationale:** The system only has 8 GB of RAM and < 1 GB free. Loading the full `BAAI/bge-m3` on CPU caused the uvicorn backend to run out of memory (OOM) and crash.
* **Database Compatibility:** Modified `backend/search.py` so that it queries the model's actual dimension (`VECTOR_SIZE`) dynamically at runtime. If the vector size changes (e.g. from 1024 to 384), the search helper automatically drops and recreates the Qdrant database collections to avoid dimension mismatch errors.

## 3. Payment Network CAIP Chain ID
* **Change:** Updated `PAYMENT_NETWORK` in `.env` to `eip155:84532` instead of the text `base-sepolia`.
* **Rationale:** Resolves route configuration errors where the X402 facilitator middleware requires the CAIP-2 standard chain ID representation to fetch the network config.

## 4. Cryptographic Agent Payments
* **Change:** Modified `backend/agent_demo.py` to use `x402Client` with a custom `CdpSmartWalletSigner` class instead of making a direct on-chain USDC transfer.
* **Rationale:** The X402 exact payment scheme expects clients to sign an off-chain EIP-3009 transfer authorization using the owner's private key (extracted from `CDP_WALLET_SECRET`). The facilitator then submits this signature on-chain. Sending a raw transaction hash in the header resulted in a `402 Payment Required` rejection.
