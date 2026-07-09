// frontend/app/brain/[public_id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Brain, FileText, Zap, ArrowLeft, Send, CheckCircle2, Award } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPublicBrain, getHealth, queryPublicBrain } from '@/lib/api';
import { payForQuery } from '@/lib/x402-payment';
import { WalletConnect } from '@/components/WalletConnect';
import { PaymentReceiptBadge } from '@/components/PaymentReceipt';
import { ChatMessage } from '@/types';
import { toast } from 'sonner';
import { activeChain } from '@/lib/wagmi-config';

export default function PublicBrainPage() {
  const params = useParams();
  const publicId = params.public_id as string;
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: activeChain.id });

  const [brain, setBrain] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userId = address ? `user_${address.slice(2, 10).toLowerCase()}` : 'anon';

  useEffect(() => {
    getPublicBrain(publicId)
      .then(setBrain)
      .catch(() => setNotFound(true));
  }, [publicId]);

  async function handleAsk() {
    if (!input.trim() || isQuerying) return;
    if (!isConnected || !walletClient) {
      toast.error('Connect your wallet first to query this brain');
      return;
    }

    const question = input.trim();
    setInput('');
    setIsQuerying(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    const loadingMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true,
    };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      toast.loading('Approve $0.001 USDC in your wallet...');
      
      // Get recipient address from backend health endpoint
      const health = await getHealth();
      const recipientAddress = health.payment?.payTo as `0x${string}`;

      if (!recipientAddress) {
        throw new Error('Could not determine payment address from backend');
      }

      // Execute on-chain USDC transfer signature
      const { txHash, receipt } = await payForQuery(recipientAddress, walletClient);
      toast.dismiss();
      toast.success(`Paid! Tx: ${txHash.slice(0, 10)}...`);

      // Query public brain with payment proof
      const result = await queryPublicBrain(publicId, question, userId, txHash);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        receipt,
      };

      setMessages(prev => prev.map(m => (m.id === loadingMsg.id ? assistantMsg : m)));
    } catch (err: any) {
      toast.dismiss();
      const errMsg = err?.response?.status === 402
        ? 'Payment required. Verify your wallet has Base Sepolia USDC.'
        : err?.message || 'Query failed';
      toast.error(errMsg);
      setMessages(prev => prev.slice(0, -2));
    } finally {
      setIsQuerying(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 p-8 text-center shadow-2xl">
          <Brain size={48} className="text-outline mx-auto mb-4" />
          <h2 className="font-headline text-2xl font-bold mb-2 text-on-surface">Brain Offline</h2>
          <p className="font-sans text-sm text-outline mb-6">
            This public brain does not exist or has been unpublished by its owner.
          </p>
          <Link href="/" className="font-sans text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1.5 transition-all">
            <ArrowLeft size={12} />
            Create Your Own Brain
          </Link>
        </div>
      </div>
    );
  }

  if (!brain) {
    return (
      <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans relative flex flex-col h-screen">
      {/* Floating Neon Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-0 left-1/3 w-[35vw] h-[35vw] bg-primary/25 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-0 right-1/3 w-[40vw] h-[40vw] bg-secondary/25 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 px-gutter h-20 flex items-center justify-between bg-surface/60 backdrop-blur-xl shadow-lg relative z-10 shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
          <Link href="/" className="text-outline hover:text-on-surface p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(172,199,255,0.4)] shrink-0">
              <Brain className="text-background" size={20} />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-headline text-sm font-bold text-on-surface truncate leading-tight">{brain.title}</h1>
              {brain.description && (
                <p className="font-sans text-[10px] text-outline truncate">{brain.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-outline">
            <span className="flex items-center gap-1">
              <FileText size={12} className="text-secondary" />
              {brain.source_count} files
            </span>
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-tertiary" />
              {brain.query_count} queries
            </span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Sources list */}
      {brain.sources_preview?.length > 0 && (
        <div className="px-gutter py-2.5 border-b border-white/5 bg-white/[0.01] flex items-center gap-2 relative z-10 shrink-0 overflow-x-auto">
          <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-semibold">Indexed Sources:</span>
          {brain.sources_preview.map((s: string) => (
            <span key={s} className="font-sans text-[10px] bg-white/5 text-primary border border-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              {s}
            </span>
          ))}
          {brain.source_count > 3 && (
            <span className="font-sans text-[10px] text-outline">+{brain.source_count - 3} more</span>
          )}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-gutter py-6 space-y-4 relative z-10">
        {messages.length === 0 && (
          <div className="text-center py-12 max-w-md mx-auto">
            <Brain size={48} className="text-primary/40 mx-auto mb-4 animate-pulse" />
            <h2 className="font-headline text-lg font-bold text-on-surface">Paid Brain Consultation</h2>
            <p className="font-sans text-sm text-outline mt-2 leading-relaxed">
              Ask anything from this public second brain. Every query requires a payment of <span className="font-semibold text-tertiary">$0.001 USDC</span> paid directly to the brain owner.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-2xl px-5 py-3.5 shadow-md relative ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-on-surface'
                : 'glass-panel border border-white/10 text-on-surface'
            }`}>
              {msg.isLoading ? (
                <div className="flex gap-1.5 items-center py-2 px-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <>
                  <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Sources Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                      <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-semibold mr-1">Sources:</span>
                      {msg.sources.map(s => (
                        <span key={s} className="font-sans text-[10px] bg-secondary-container/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Payment Receipt */}
                  {msg.receipt && (
                    <div className="mt-3 pt-2 border-t border-white/5">
                      <PaymentReceiptBadge receipt={msg.receipt} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input controls */}
      <div className="border-t border-white/10 px-gutter py-4 bg-surface-container/60 backdrop-blur-xl relative z-10 shrink-0">
        {mounted && !isConnected && (
          <p className="font-sans text-xs text-secondary text-center mb-3 font-semibold">
            Connect wallet to query this brain ($0.001 USDC on Base Sepolia per query)
          </p>
        )}
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
            placeholder={mounted && isConnected ? "Ask this brain a question..." : "Connect wallet to ask..."}
            disabled={!mounted || !isConnected || isQuerying}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:bg-white/10 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleAsk}
            disabled={!mounted || !isConnected || !input.trim() || isQuerying}
            className="bg-gradient-to-r from-primary to-secondary text-background hover:opacity-90 disabled:opacity-40 px-6 py-3.5 rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-[0_0_15px_rgba(172,199,255,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <Send size={15} />
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
