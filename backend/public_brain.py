# backend/public_brain.py

import json
import os
import random
import string
from datetime import datetime
from pathlib import Path

# Store public brain registry as a JSON file next to qdrant_data/
REGISTRY_FILE = Path(os.getenv("DATA_DIR", ".")) / "public_brains.json"


def _load_registry() -> dict:
    """Load the public brain registry from disk."""
    if not REGISTRY_FILE.exists():
        return {}
    with open(REGISTRY_FILE, "r") as f:
        return json.load(f)


def _save_registry(registry: dict):
    """Save the public brain registry to disk."""
    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2, default=str)


def _generate_public_id(title: str) -> str:
    """
    Generate a unique public_id from the brain title.
    Example: "My Study Notes" → "my-study-notes-7x4k"
    The 4-char suffix ensures uniqueness even if titles are similar.
    """
    # Slugify the title
    slug = title.lower().strip()
    slug = "".join(c if c.isalnum() or c == " " else "" for c in slug)
    slug = "-".join(slug.split())[:30]  # max 30 chars
    if not slug:
        slug = "brain"

    # Add 4 random chars for uniqueness
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{slug}-{suffix}"


def publish_brain(
    owner_user_id: str,
    title: str,
    description: str = "",
) -> dict:
    """
    Create or update a public brain record.
    Returns the public brain dict with public_id.
    If owner already has a brain, updates it instead of creating a new one.
    """
    registry = _load_registry()

    # Check if owner already has a published brain
    existing = None
    for pid, brain in registry.items():
        if brain["owner_user_id"] == owner_user_id:
            existing = pid
            break

    if existing:
        # Update existing brain
        registry[existing]["title"] = title
        registry[existing]["description"] = description
        registry[existing]["updated_at"] = datetime.now().isoformat()
        registry[existing]["is_active"] = True
        _save_registry(registry)
        return registry[existing]
    else:
        # Create new brain
        public_id = _generate_public_id(title)
        # Ensure uniqueness
        while public_id in registry:
            public_id = _generate_public_id(title)

        brain = {
            "public_id": public_id,
            "owner_user_id": owner_user_id,
            "title": title,
            "description": description,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "query_count": 0,
            "total_earned_usdc": "0.0",
        }
        registry[public_id] = brain
        _save_registry(registry)
        return brain


def get_brain_by_public_id(public_id: str) -> dict | None:
    """Fetch a public brain by its public_id. Returns None if not found or inactive."""
    registry = _load_registry()
    brain = registry.get(public_id)
    if not brain or not brain.get("is_active"):
        return None
    return brain


def get_brain_by_owner(owner_user_id: str) -> dict | None:
    """Fetch the brain owned by a specific user_id."""
    registry = _load_registry()
    for brain in registry.values():
        if brain["owner_user_id"] == owner_user_id:
            return brain
    return None


def unpublish_brain(owner_user_id: str) -> bool:
    """Set is_active=False for a brain. Returns True if found."""
    registry = _load_registry()
    for pid, brain in registry.items():
        if brain["owner_user_id"] == owner_user_id:
            registry[pid]["is_active"] = False
            _save_registry(registry)
            return True
    return False


def increment_query_count(public_id: str, usdc_earned: str = "0.001"):
    """
    Called after each successful paid query on a public brain.
    Increments query_count and adds to total_earned_usdc.
    """
    registry = _load_registry()
    if public_id in registry:
        registry[public_id]["query_count"] += 1
        current = float(registry[public_id].get("total_earned_usdc", "0.0"))
        registry[public_id]["total_earned_usdc"] = str(round(current + float(usdc_earned), 6))
        _save_registry(registry)


def list_all_brains(active_only: bool = True) -> list[dict]:
    """Return all public brains. Used for a future discovery page."""
    registry = _load_registry()
    brains = list(registry.values())
    if active_only:
        brains = [b for b in brains if b.get("is_active")]
    return sorted(brains, key=lambda b: b.get("query_count", 0), reverse=True)
