// frontend/lib/x402-payment.ts

import { parseUnits, encodeFunctionData } from 'viem';
import { USDC_ADDRESS, QUERY_PRICE_USDC } from './wagmi-config';
import { PaymentReceipt } from '@/types';

// Minimal ERC-20 ABI — only what we need for USDC transfer
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Pay $0.001 USDC on Base to the MemoryMint wallet.
 * Returns the tx hash to use as X-PAYMENT proof.
 *
 * @param recipientAddress - MemoryMint's WALLET_ADDRESS from .env
 * @param walletClient - wagmi wallet client (from useWalletClient hook)
 */
export async function payForQuery(
  recipientAddress: `0x${string}`,
  walletClient: any
): Promise<{ txHash: string; receipt: PaymentReceipt }> {
  // USDC has 6 decimals
  const amount = parseUnits(QUERY_PRICE_USDC, 6);

  // Encode the ERC-20 transfer call
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipientAddress, amount],
  });

  // This triggers the MetaMask / Coinbase Wallet popup
  const txHash = await walletClient.sendTransaction({
    to: USDC_ADDRESS as `0x${string}`,
    data,
  });

  const isDev = process.env.NEXT_PUBLIC_NETWORK !== 'base';
  const explorerBase = isDev
    ? 'https://sepolia.basescan.org/tx/'
    : 'https://basescan.org/tx/';

  const receipt: PaymentReceipt = {
    txHash,
    amount: QUERY_PRICE_USDC,
    asset: 'USDC',
    network: isDev ? 'Base Sepolia' : 'Base',
    explorerUrl: `${explorerBase}${txHash}`,
    timestamp: new Date(),
  };

  return { txHash, receipt };
}
