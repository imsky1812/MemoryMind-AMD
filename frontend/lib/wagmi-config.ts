// frontend/lib/wagmi-config.ts

import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';

// Use baseSepolia for dev, base for production submission
const isDev = process.env.NEXT_PUBLIC_NETWORK !== 'base';
const activeChain = isDev ? baseSepolia : base;

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [
    injected(), // Detects any injected wallet (MetaMask, Brave, etc.)
    coinbaseWallet({
      appName: 'MemoryMint',
      appLogoUrl: 'https://i.imgur.com/YDhS1nK.png',
      // preference options configures Coinbase Wallet behavior
      preference: {
        options: 'eoaOnly',
      },
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export { activeChain };

// USDC contract address
export const USDC_ADDRESS = isDev
  ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia USDC
  : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC

export const QUERY_PRICE_USDC = '0.001';
