# setup_wallet.py
#
# Run this ONCE to create your Base Sepolia wallet and print your receiving address.
# Usage: python setup_wallet.py
#
# After running:
#   1. WALLET_ADDRESS and WALLET_ID are auto-updated in .env
#   2. Never commit wallet_seed.json to git (it's already in .gitignore)

import json
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

print("MemoryMint - Wallet Setup")
print("=" * 50)


async def create_wallet():
    try:
        from cdp import CdpClient

        # Load credentials from JSON key file or .env
        key_file = "cdp_api_key.json"
        if os.path.exists(key_file):
            print(f"Loading CDP credentials from {key_file}...")
            with open(key_file) as f:
                creds = json.load(f)
            api_key_id = creds.get("id")
            api_key_secret = creds.get("privateKey")
        else:
            print("Loading CDP credentials from .env...")
            api_key_id = os.getenv("CDP_API_KEY_ID")
            api_key_secret = os.getenv("CDP_API_KEY_SECRET")

        if not api_key_id or api_key_id.startswith("your_"):
            print("ERROR: CDP credentials not found.")
            print("Place cdp_api_key.json in the project root.")
            return

        async with CdpClient(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            wallet_secret=os.getenv("CDP_WALLET_SECRET"),
        ) as cdp:
            print("Creating EVM server account (network-agnostic in cdp-sdk v1.47+)...")
            account = await cdp.evm.create_account()

            wallet_address = account.address
            wallet_id = account.name  # account name acts as the ID

            print("\n" + "=" * 50)
            print("WALLET CREATED SUCCESSFULLY!")
            print("=" * 50)
            print(f"Wallet Address: {wallet_address}")
            print(f"Wallet Name/ID: {wallet_id}")
            print("=" * 50)

            # Auto-update .env
            env_path = ".env"
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    content = f.read()

                lines = content.split("\n")
                new_lines = []
                for line in lines:
                    if line.startswith("WALLET_ADDRESS="):
                        new_lines.append(f"WALLET_ADDRESS={wallet_address}")
                    elif line.startswith("WALLET_ID="):
                        new_lines.append(f"WALLET_ID={wallet_id}")
                    else:
                        new_lines.append(line)

                with open(env_path, "w") as f:
                    f.write("\n".join(new_lines))
                print("\n.env updated automatically!")

            print("\nNext step: Get testnet USDC from https://faucet.circle.com")
            print(f"Paste your wallet address: {wallet_address}")
            print("\nThen run: python test_payment.py")

    except ImportError:
        print("ERROR: cdp-sdk not installed. Run: venv\\Scripts\\pip install cdp-sdk")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(create_wallet())
