# test_payment.py
#
# Manual verification script for X402 middleware.
# Run from project root: python test_payment.py
# No CDP wallet needed — just verifies the server behaves correctly.

import httpx
import json

API_BASE = "http://localhost:8000"
# Use a client with 30s timeout to prevent read timeouts during lazy initialization
httpx = httpx.Client(timeout=30.0)


def pp(data):
    """Pretty print JSON."""
    print(json.dumps(data, indent=2))


print("\n" + "=" * 60)
print("  MemoryMint — Week 2 Payment Tests")
print("=" * 60)

# ── Test 1: Health check ──────────────────────────────────────────────────────
print("\n--- Test 1: Health check (should show payment config) ---")
r = httpx.get(f"{API_BASE}/health")
print(f"Status: {r.status_code}")
pp(r.json())

# ── Test 2: Payment info endpoint ─────────────────────────────────────────────
print("\n--- Test 2: GET /payment-info (AI agents use this to discover payment) ---")
r = httpx.get(f"{API_BASE}/payment-info")
print(f"Status: {r.status_code}")
pp(r.json())

# ── Test 3: /query without payment ────────────────────────────────────────────
print("\n--- Test 3: POST /query WITHOUT payment header (expect 402 or 422) ---")
r = httpx.post(f"{API_BASE}/query", data={
    "user_id": "test_user",
    "question": "What is in my brain?"
})
print(f"Status: {r.status_code}")
if r.status_code == 402:
    print("[OK] Got 402 Payment Required - X402 middleware is active!")
elif r.status_code == 200:
    print("[!!] Got 200 - X402 middleware not active (check WALLET_ADDRESS in .env)")
elif r.status_code == 422:
    print("[OK] Got 422 - Server running but no documents ingested yet")
pp(r.json())

# ── Test 4: /query with mock payment header ────────────────────────────────────
print("\n--- Test 4: POST /query WITH mock X-PAYMENT header ---")
r = httpx.post(
    f"{API_BASE}/query",
    data={"user_id": "test_user", "question": "What is in my brain?"},
    headers={"X-PAYMENT": "test_mock_proof_12345"}
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print("[OK] Query succeeded with payment header")
elif r.status_code == 402:
    print("[!!] Still got 402 - X402 middleware is rejecting mock proof (expected in production)")
pp(r.json())

# ── Test 5: /ingest still works free ──────────────────────────────────────────
print("\n--- Test 5: POST /ingest (free - no payment required) ---")

with open("test_note.txt", "w") as f:
    f.write(
        "MemoryMint test note for Week 2 payment testing. "
        "The project deadline is July 11, 2026. "
        "This is a pay-per-query Second Brain using X402 protocol on Base chain."
    )

with open("test_note.txt", "rb") as f:
    r = httpx.post(
        f"{API_BASE}/ingest",
        files={"file": ("test_note.txt", f, "text/plain")},
        data={"user_id": "test_user"},
    )
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print("[OK] Ingest works without payment!")
pp(r.json())

# ── Test 6: GET /payment-info returns correct structure ────────────────────────
print("\n--- Test 6: Verify payment-info structure for AI agent compatibility ---")
r = httpx.get(f"{API_BASE}/payment-info")
data = r.json()
accepts = data.get("payment_required", {}).get("accepts", [])
if accepts:
    cfg = accepts[0]
    required_fields = ["scheme", "network", "maxAmountRequired", "payTo", "asset"]
    missing = [f for f in required_fields if not cfg.get(f)]
    if missing:
        print(f"[!!] Missing fields in payment config: {missing}")
        print("     Check that WALLET_ADDRESS is set in .env")
    else:
        print("[OK] Payment config has all required fields for X402 compatibility")
        print(f"     Price: ${cfg['maxAmountRequired']} {cfg['asset']} on {cfg['network']}")
        print(f"     Pay to: {cfg['payTo']}")
else:
    print("[!!] No 'accepts' array in payment-info response")

print("\n" + "=" * 60)
print("  Tests complete! Check results above.")
print("=" * 60 + "\n")
