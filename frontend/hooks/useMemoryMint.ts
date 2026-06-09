'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ingestFile, queryBrain, getSources, deleteSource } from '@/lib/api';
import { payForQuery } from '@/lib/x402-payment';
import { ChatMessage, Source,IngestResponse, DuplicateResponse } from '@/types';
import { activeChain } from '@/lib/wagmi-config';

export function useMemoryMint() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: activeChain.id });
  const userId = 'demo_user';

  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isQuerying, setIsQuerying] = useState(false);
  const [stats, setStats] = useState({ totalQueries: 0, totalEarned: '0.000' });

  // Load on mount automatically — no external call needed
  useEffect(() => {
    getSources(userId)
      .then(data => setSources([...data]))
      .catch(() => toast.error('Could not load sources. Is the backend running?'));
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<IngestResponse | DuplicateResponse | undefined> => {
  setIsUploading(true);
  setUploadProgress(0);
  try {
    const result = await ingestFile(file, userId, setUploadProgress);
    toast.success(`${file.name} added — ${result.chunks_stored} chunks stored`);
    const fresh = await getSources(userId);
    setSources([...fresh]);
    return result;
  } catch (err: any) {
    if (err?.response?.status === 409) {
      return { duplicate: true, filename: file.name };
    } else {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    }
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
}, [userId]);

  const removeSource = useCallback(async (filename: string) => {
    try {
      await deleteSource(userId, filename);
      toast.success(`${filename} removed`);
      const fresh = await getSources(userId);
      setSources([...fresh]);
    } catch {
      toast.error('Delete failed');
    }
  }, [userId]);

  const askQuestion = useCallback(async (question: string) => {
    if (!isConnected || !walletClient) {
      toast.error('Connect your wallet first to pay for queries');
      return;
    }
    if (sources.length === 0) {
      toast.error('Upload at least one document first');
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: question };
    const loadingMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', isLoading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsQuerying(true);

    try {
      toast.loading('Approve $0.001 USDC in your wallet...');

      const healthRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`);
      const health = await healthRes.json();
      const recipientAddress = health?.payment?.payTo as `0x${string}`;

      if (!recipientAddress) throw new Error('Could not determine payment address from backend');

      const { txHash, receipt } = await payForQuery(recipientAddress, walletClient);
      toast.dismiss();
      toast.success(`Paid! Tx: ${txHash.slice(0, 10)}...`);

      const result = await queryBrain(question, userId, txHash);
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        totalEarned: (parseFloat(prev.totalEarned) + 0.001).toFixed(3),
      }));

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { id: loadingMsg.id, role: 'assistant', content: result.answer, sources: result.sources, receipt }
          : m
      ));
    } catch (err: any) {
      toast.dismiss();
      const errorMsg = err?.response?.status === 402
        ? 'Payment required. Make sure your wallet has Base Sepolia USDC.'
        : err?.message || 'Query failed';
      toast.error(errorMsg);
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id ? { ...m, isLoading: false, content: `Error: ${errorMsg}` } : m
      ));
    } finally {
      setIsQuerying(false);
    }
  }, [isConnected, walletClient, sources, userId]);

  return {
    sources, messages, isUploading, uploadProgress, isQuerying, stats,
    userId, isConnected, address,
    uploadFile, removeSource, askQuestion,
  };
}