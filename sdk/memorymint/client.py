# sdk/memorymint/client.py

"""
MemoryMint Python SDK
Query any published MemoryMint brain from Python code or AI agents.

Usage:
    from memorymint import MemoryMintClient

    client = MemoryMintClient(
        api_url="http://localhost:8000",
        cdp_api_key_name="your_key",
        cdp_api_key_private_key="your_private_key",
        wallet_id="your_wallet_id",
        wallet_seed_path="wallet_seed.json",
        network="base-sepolia",
    )

    result = client.query(
        brain_id="my-study-notes-7x4k",
        question="What is this brain about?",
    )
    print(result.answer)
    print(result.sources)
    print(result.payment_tx)
"""

import httpx
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class QueryResult:
    """Result from a paid brain query."""
    answer: str
    sources: list[str]
    chunks_used: int
    brain_title: str
    payment_amount: str
    payment_tx: str
    payment_network: str
    latency_ms: int


@dataclass
class BrainInfo:
    """Metadata about a public brain."""
    public_id: str
    title: str
    description: str
    source_count: int
    query_count: int
    sources_preview: list[str]


class MemoryMintClient:
    """
    Client for querying MemoryMint public brains.
    Handles X402 payment automatically using Coinbase Developer Platform.

    Parameters:
        api_url: MemoryMint API base URL (e.g. "https://memorymint.app")
        cdp_api_key_name: CDP API key name from portal.cdp.coinbase.com
        cdp_api_key_private_key: CDP API private key
        wallet_id: Your CDP wallet ID (from setup_wallet.py)
        wallet_seed_path: Path to wallet_seed.json
        network: "base-sepolia" (testnet) or "base-mainnet" (production)
    """

    def __init__(
        self,
        api_url: str,
        cdp_api_key_name: Optional[str] = None,
        cdp_api_key_private_key: Optional[str] = None,
        wallet_id: Optional[str] = None,
        wallet_seed_path: str = "wallet_seed.json",
        network: str = "base-sepolia",
    ):
        self.api_url = api_url.rstrip("/")
        self.network = network
        self._http = httpx.Client(timeout=30)

        # Set up CDP wallet if credentials provided
        self._wallet = None
        if cdp_api_key_name and cdp_api_key_private_key and wallet_id:
            self._setup_wallet(
                cdp_api_key_name, cdp_api_key_private_key,
                wallet_id, wallet_seed_path
            )

    def _setup_wallet(
        self, key_name: str, private_key: str,
        wallet_id: str, seed_path: str
    ):
        """Initialize CDP wallet for automatic payment."""
        try:
            from cdp import Cdp, Wallet
            Cdp.configure(api_key_name=key_name, api_key_private_key=private_key)
            self._wallet = Wallet.fetch(wallet_id)
            self._wallet.load_seed(seed_path)
        except ImportError:
            raise ImportError(
                "cdp-sdk not installed. Run: pip install cdp-sdk"
            )
        except Exception as e:
            raise ConnectionError(f"Failed to initialize CDP wallet: {e}")

    def get_brain(self, brain_id: str) -> BrainInfo:
        """
        Fetch metadata about a public brain.
        Free — no payment required.

        Args:
            brain_id: The public brain ID (e.g. "my-notes-7x4k")

        Returns:
            BrainInfo object with title, description, source count, etc.
        """
        r = self._http.get(f"{self.api_url}/brain/{brain_id}")
        if r.status_code == 404:
            raise ValueError(f"Brain '{brain_id}' not found or not published")
        r.raise_for_status()
        data = r.json()
        return BrainInfo(
            public_id=data["public_id"],
            title=data["title"],
            description=data.get("description", ""),
            source_count=data.get("source_count", 0),
            query_count=data.get("query_count", 0),
            sources_preview=data.get("sources_preview", []),
        )

    def check_payment_requirements(self, brain_id: str) -> dict:
        """
        Check what payment is required to query a brain.
        Returns payment config dict.
        """
        r = self._http.get(f"{self.api_url}/payment-info")
        r.raise_for_status()
        return r.json()

    def query(
        self,
        brain_id: str,
        question: str,
        querier_id: str = "sdk_agent",
        max_retries: int = 3,
    ) -> QueryResult:
        """
        Query a public brain. Pays X402 automatically.

        This is the main SDK method. The agent:
        1. Checks the brain exists
        2. Discovers payment requirements (amount, wallet, network)
        3. Pays using CDP wallet
        4. Retries the query with payment proof
        5. Returns the answer

        Args:
            brain_id: Public brain ID to query
            question: Natural language question
            querier_id: Identifier for this agent (for logging)
            max_retries: Retry attempts on payment failure

        Returns:
            QueryResult with answer, sources, and payment receipt
        """
        if not self._wallet:
            raise RuntimeError(
                "CDP wallet not configured. Pass cdp_api_key_name, "
                "cdp_api_key_private_key, and wallet_id to MemoryMintClient."
            )

        t0 = time.perf_counter()

        # Step 1: Verify brain exists
        brain_r = self._http.get(f"{self.api_url}/brain/{brain_id}")
        if brain_r.status_code == 404:
            raise ValueError(f"Brain '{brain_id}' not found")
        brain_data = brain_r.json()

        # Step 2: Discover payment requirements
        payment_info = self.check_payment_requirements(brain_id)
        pay_config = payment_info["payment_required"]["accepts"][0]
        amount = pay_config["maxAmountRequired"]
        pay_to = pay_config["payTo"]

        # Step 3: Make payment
        payment_proof = self._pay(amount, pay_to)

        # Step 4: Query with payment proof
        for attempt in range(max_retries):
            form_data = {
                "question": question,
                "querier_user_id": querier_id,
            }
            r = self._http.post(
                f"{self.api_url}/brain/{brain_id}/query",
                data=form_data,
                headers={"X-PAYMENT": payment_proof},
            )

            if r.status_code == 200:
                data = r.json()
                latency_ms = int((time.perf_counter() - t0) * 1000)
                return QueryResult(
                    answer=data["answer"],
                    sources=data.get("sources", []),
                    chunks_used=data.get("chunks_used", 0),
                    brain_title=brain_data.get("title", ""),
                    payment_amount=amount,
                    payment_tx=payment_proof,
                    payment_network=self.network,
                    latency_ms=latency_ms,
                )
            elif r.status_code == 402 and attempt < max_retries - 1:
                # Re-pay and retry
                payment_proof = self._pay(amount, pay_to)
            else:
                raise RuntimeError(
                    f"Query failed after {attempt + 1} attempts. "
                    f"Status: {r.status_code}. Response: {r.text[:200]}"
                )

        raise RuntimeError("Max retries exceeded")

    def _pay(self, amount: str, pay_to: str) -> str:
        """
        Make USDC payment via CDP wallet.
        Returns payment proof (tx hash).
        """
        transfer = self._wallet.transfer(
            amount=amount,
            asset_id="usdc",
            destination=pay_to,
        )
        transfer.wait()
        return transfer.transaction_hash

    def batch_query(
        self,
        brain_id: str,
        questions: list[str],
        querier_id: str = "sdk_agent",
    ) -> list[QueryResult]:
        """
        Query a brain multiple times. Pays separately for each query.
        Useful for agents that need to ask several questions.

        Args:
            brain_id: Public brain ID
            questions: List of questions to ask
            querier_id: Agent identifier

        Returns:
            List of QueryResult objects, one per question
        """
        results = []
        for q in questions:
            result = self.query(brain_id, q, querier_id)
            results.append(result)
        return results

    def close(self):
        """Close the HTTP client."""
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
