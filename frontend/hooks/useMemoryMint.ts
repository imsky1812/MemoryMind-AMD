// frontend/hooks/useMemoryMint.ts

'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ingestFile, queryBrain, getSources, deleteSource, getHealth } from '@/lib/api';
import { payForQuery } from '@/lib/x402-payment';
import { ChatMessage, Source } from '@/types';
import { activeChain } from '@/lib/wagmi-config';

// In production, derive user_id from wallet address.
// For now, use a stable local ID.
function getUserId(address?: string): string {
  return address ? `user_${address.slice(2, 10).toLowerCase()}` : 'demo_user';
}

export function useMemoryMint() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: activeChain.id });

  const userId = getUserId(address);

  // ── State ─────────────────────────────────────────────────────────────────

  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isQuerying, setIsQuerying] = useState(false);
  const [stats, setStats] = useState({ totalQueries: 0, totalEarned: '0.000' });

  // ── Load sources ──────────────────────────────────────────────────────────

  const loadSources = useCallback(async () => {
    try {
      const data = await getSources(userId);
      setSources(data);
    } catch (err) {
      toast.error('Could not load sources. Is the backend running?');
    }
  }, [userId]);

  // ── Ingest file ───────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await ingestFile(file, userId, setUploadProgress);
      toast.success(`${file.name} added — ${result.chunks_stored} chunks stored`);
      await loadSources();
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Upload failed';
      toast.error(msg);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, loadSources]);

  // ── Remove source ─────────────────────────────────────────────────────────

  const removeSource = useCallback(async (filename: string) => {
    try {
      await deleteSource(userId, filename);
      toast.success(`${filename} removed`);
      await loadSources();
    } catch {
      toast.error('Delete failed');
    }
  }, [userId, loadSources]);

  // ── Query (with X402 payment) ─────────────────────────────────────────────

  const askQuestion = useCallback(async (question: string, sourceFilter?: string) => {
    if (!isConnected || !walletClient) {
      toast.error('Connect your wallet first to pay for queries');
      return;
    }

    if (sources.length === 0) {
      toast.error('Upload at least one document first');
      return;
    }

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };

    // Add loading assistant message
    const loadingMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsQuerying(true);

    try {
      // Step 1: Pay via wallet
      toast.loading('Approve $0.001 USDC in your wallet...');

      // Get recipient address from backend health endpoint
      const health = await getHealth();
      const recipientAddress = health.payment?.payTo as `0x${string}`;

      if (!recipientAddress) {
        throw new Error('Could not determine payment address from backend');
      }

      const { txHash, receipt } = await payForQuery(recipientAddress, walletClient);
      toast.dismiss();
      toast.success(`Paid! Tx: ${txHash.slice(0, 10)}...`);

      // Step 2: Query backend with payment proof
      const result = await queryBrain(question, userId, txHash, sourceFilter);

      // Update stats
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        totalEarned: (parseFloat(prev.totalEarned) + 0.001).toFixed(3),
      }));

      // Replace loading message with real answer
      const assistantMsg: ChatMessage = {
        id: loadingMsg.id,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        receipt,
      };

      setMessages(prev =>
        prev.map(m => (m.id === loadingMsg.id ? assistantMsg : m))
      );

    } catch (err: any) {
      toast.dismiss();

      const errorMsg = err?.response?.status === 402
        ? 'Payment required. Make sure your wallet has Base Sepolia USDC.'
        : err?.message || 'Query failed';

      toast.error(errorMsg);

      // Replace loading message with error
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, isLoading: false, content: `Error: ${errorMsg}` }
            : m
        )
      );
    } finally {
      setIsQuerying(false);
    }
  }, [isConnected, walletClient, sources, userId]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // State
    sources,
    messages,
    isUploading,
    uploadProgress,
    isQuerying,
    stats,
    userId,
    isConnected,
    address,
    // Actions
    loadSources,
    uploadFile,
    removeSource,
    askQuestion,
    clearChat,
  };
}
