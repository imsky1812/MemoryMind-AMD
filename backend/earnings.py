# backend/earnings.py

import json
import os
from datetime import datetime
from pathlib import Path

EARNINGS_FILE = Path(os.getenv("DATA_DIR", ".")) / "earnings.json"


def _load_earnings() -> dict:
    if not EARNINGS_FILE.exists():
        return {}
    with open(EARNINGS_FILE, "r") as f:
        return json.load(f)


def _save_earnings(data: dict):
    EARNINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(EARNINGS_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def record_payment(
    owner_user_id: str,
    querier_user_id: str,
    question: str,
    sources_queried: list[str],
    amount_usdc: str = "0.001",
    tx_hash: str = "",
    public_id: str = "",
):
    """
    Record a successful paid query.
    Called from main.py after every successful /query that earned the owner money.

    owner_user_id: who earned the money (brain owner)
    querier_user_id: who paid (can be same as owner for own brain)
    sources_queried: which source files were returned as context
    """
    data = _load_earnings()

    if owner_user_id not in data:
        data[owner_user_id] = {
            "total_earned_usdc": "0.0",
            "total_queries": 0,
            "transactions": [],
            "per_source": {},
        }

    # Add transaction record
    tx_record = {
        "timestamp": datetime.now().isoformat(),
        "amount_usdc": amount_usdc,
        "querier": querier_user_id,
        "question_preview": question[:80] + "..." if len(question) > 80 else question,
        "sources": sources_queried,
        "tx_hash": tx_hash,
        "public_id": public_id,
    }
    data[owner_user_id]["transactions"].append(tx_record)

    # Keep only last 100 transactions in memory (avoid unbounded growth)
    data[owner_user_id]["transactions"] = data[owner_user_id]["transactions"][-100:]

    # Update totals
    current = float(data[owner_user_id]["total_earned_usdc"])
    data[owner_user_id]["total_earned_usdc"] = str(round(current + float(amount_usdc), 6))
    data[owner_user_id]["total_queries"] += 1

    # Per-source breakdown — which file earns most
    for source in sources_queried:
        if source not in data[owner_user_id]["per_source"]:
            data[owner_user_id]["per_source"][source] = {
                "query_count": 0,
                "earned_usdc": "0.0",
            }
        data[owner_user_id]["per_source"][source]["query_count"] += 1
        src_current = float(data[owner_user_id]["per_source"][source]["earned_usdc"])
        data[owner_user_id]["per_source"][source]["earned_usdc"] = str(
            round(src_current + float(amount_usdc), 6)
        )

    _save_earnings(data)


def get_earnings(owner_user_id: str) -> dict:
    """
    Return full earnings summary for a user.
    Used by GET /earnings/{user_id} endpoint.
    """
    data = _load_earnings()
    if owner_user_id not in data:
        return {
            "total_earned_usdc": "0.0",
            "total_queries": 0,
            "transactions": [],
            "per_source": {},
        }
    return data[owner_user_id]


def get_earnings_summary(owner_user_id: str) -> dict:
    """
    Return lightweight summary (no full tx list).
    Used by the dashboard stats bar.
    """
    full = get_earnings(owner_user_id)
    recent_txs = full["transactions"][-5:]  # last 5 only

    # Top sources by query count
    per_source = full["per_source"]
    top_sources = sorted(
        [{"source": k, **v} for k, v in per_source.items()],
        key=lambda x: x["query_count"],
        reverse=True,
    )[:5]

    return {
        "total_earned_usdc": full["total_earned_usdc"],
        "total_queries": full["total_queries"],
        "recent_transactions": recent_txs,
        "top_sources": top_sources,
    }
