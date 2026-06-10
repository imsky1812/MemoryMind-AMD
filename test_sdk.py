# test_sdk.py — run from project root

import os
from dotenv import load_dotenv
load_dotenv()

print("=== MemoryMint SDK Test ===\n")

# Install the SDK locally first:
# cd sdk && pip install -e . && cd ..

from memorymint import MemoryMintClient

# Test 1: get_brain (free, no payment needed)
print("Test 1: get_brain() — no payment required")
client = MemoryMintClient(api_url="http://localhost:8000")

# First, publish a brain to test against (if not done via UI)
import httpx
r = httpx.post("http://localhost:8000/brain/publish", json={
    "user_id": "test_sdk_user",
    "title": "SDK Test Brain",
    "description": "Brain for SDK testing",
})
print(f"Publish response: {r.status_code}")
brain_data = r.json()
public_id = brain_data.get("public_id", "")
print(f"Public ID: {public_id}")

if public_id:
    brain = client.get_brain(public_id)
    print(f"Brain title: {brain.title}")
    print(f"Source count: {brain.source_count}")
    print("Test 1: PASS\n")

# Test 2: Full query with payment
# Only runs if CDP wallet is configured in .env
if os.getenv("CDP_API_KEY_NAME") and public_id:
    print("Test 2: query() — with X402 payment")
    client_with_payment = MemoryMintClient(
        api_url="http://localhost:8000",
        cdp_api_key_name=os.getenv("CDP_API_KEY_NAME"),
        cdp_api_key_private_key=os.getenv("CDP_API_KEY_PRIVATE_KEY"),
        wallet_id=os.getenv("WALLET_ID"),
        wallet_seed_path="wallet_seed.json",
        network="base-sepolia",
    )
    result = client_with_payment.query(
        brain_id=public_id,
        question="What documents are in this brain?",
    )
    print(f"Answer: {result.answer[:150]}...")
    print(f"Sources: {result.sources}")
    print(f"Payment: ${result.payment_amount} USDC")
    print(f"Tx: {result.payment_tx}")
    print(f"Latency: {result.latency_ms}ms")
    print("Test 2: PASS")
else:
    print("Test 2: SKIPPED (CDP wallet not configured in .env)")

print("\n=== SDK tests complete ===")
