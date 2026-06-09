# backend/payment.py
#
# X402 payment configuration and response helpers.
# The PAYMENT_CONFIG dict is what the server returns in HTTP 402 responses —
# both human wallets and AI agents read this to know how much to pay and where.

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Payment Configuration ────────────────────────────────────────────────────

PAYMENT_CONFIG = {
    "scheme": "exact",
    "network": os.getenv("PAYMENT_NETWORK", "base-sepolia"),
    "maxAmountRequired": os.getenv("QUERY_PRICE_USD", "0.001"),
    "resource": "/query",
    "description": "MemoryMint: 1 query against your Second Brain",
    "mimeType": "application/json",
    "payTo": os.getenv("WALLET_ADDRESS", ""),
    "maxTimeoutSeconds": 300,
    "asset": "USDC",
    "extra": {
        "name": "MemoryMint Query",
        "version": "1",
    },
}


def get_payment_config() -> dict:
    """Return X402 payment requirements for the /query endpoint."""
    return PAYMENT_CONFIG


def format_402_response() -> dict:
    """
    Format the HTTP 402 response body.
    This is what clients receive when they hit /query without payment.
    AI agents parse this to understand how much to pay and where to send it.
    """
    return {
        "error": "Payment Required",
        "x402Version": 1,
        "accepts": [PAYMENT_CONFIG],
        "error_description": (
            f"This endpoint requires a micropayment of "
            f"${PAYMENT_CONFIG['maxAmountRequired']} USDC on {PAYMENT_CONFIG['network']}. "
            f"Include X-PAYMENT header with valid payment proof."
        ),
    }
