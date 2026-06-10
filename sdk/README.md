# MemoryMint SDK

Query any MemoryMint public brain from Python. Payments handled automatically via X402.

## Install

```bash
pip install memorymint-sdk
```

## Usage

```python
from memorymint import MemoryMintClient

client = MemoryMintClient(
    api_url="https://memorymint.app",
    cdp_api_key_name="your_key_name",
    cdp_api_key_private_key="your_private_key",
    wallet_id="your_wallet_id",
    wallet_seed_path="wallet_seed.json",
    network="base-mainnet",
)

result = client.query(
    brain_id="my-study-notes-7x4k",
    question="What are the key points about neural networks?",
)

print(result.answer)
print("Sources:", result.sources)
print("Paid:", result.payment_amount, "USDC")
print("Tx:", result.payment_tx)
```

## Cost

$0.001 USDC per query, paid automatically to the brain owner.
