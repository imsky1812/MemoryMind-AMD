// frontend/app/earnings/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowLeft, TrendingUp, Zap, FileText, Clock, ExternalLink, Trophy } from 'lucide-react';
import Link from 'next/link';
import { getEarnings, getBrainByOwner } from '@/lib/api';
import { WalletConnect } from '@/components/WalletConnect';
import { toast } from 'sonner';

interface Transaction {
  timestamp: string;
  amount_usdc: string;
  querier: string;
  question_preview: string;
  sources: string[];
  tx_hash: string;
}

interface SourceEarning {
  source: string;
  query_count: number;
  earned_usdc: string;
}

interface EarningsData {
  total_earned_usdc: string;
  total_queries: number;
  transactions: Transaction[];
  per_source: Record<string, { query_count: number; earned_usdc: string }>;
}

export default function EarningsPage() {
  const { address, isConnected } = useAccount();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [brain, setBrain] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Deriving stable ID for user Qdrant collection/registry lookup
  const userId = address ? `user_${address.slice(2, 10).toLowerCase()}` : null;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getEarnings(userId),
      getBrainByOwner(userId).catch(() => null),
    ]).then(([earningsData, brainData]) => {
      setEarnings(earningsData);
      setBrain(brainData);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [userId]);

  if (!isConnected) {
    return (
      <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans flex flex-col items-center justify-center p-6">
        {/* Floating Neon Mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[45vw] h-[45vw] bg-secondary/20 rounded-full blur-[140px]"></div>
        </div>
        <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 p-8 text-center shadow-2xl relative z-10">
          <Trophy size={48} className="text-secondary mx-auto mb-4" />
          <h2 className="font-headline text-2xl font-bold mb-2 text-on-surface">Earnings Vault</h2>
          <p className="font-sans text-sm text-outline mb-6">
            Connect your Web3 wallet to access your earnings details, public brain analytics, and payment streams.
          </p>
          <div className="flex justify-center mb-6">
            <WalletConnect />
          </div>
          <Link href="/" className="font-sans text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1.5 transition-all">
            <ArrowLeft size={12} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sourceEarnings: SourceEarning[] = earnings
    ? Object.entries(earnings.per_source)
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.query_count - a.query_count)
    : [];

  return (
    <div className="min-h-screen text-on-surface antialiased bg-surface-container-lowest font-sans relative flex flex-col">
      {/* Floating Neon Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-0 left-1/3 w-[35vw] h-[35vw] bg-primary/25 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-0 right-1/3 w-[40vw] h-[40vw] bg-secondary/25 rounded-full blur-[140px] animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 px-gutter h-20 flex items-center justify-between bg-surface/60 backdrop-blur-xl shadow-lg relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-outline hover:text-on-surface p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-headline text-lg font-bold text-on-surface leading-tight">Earnings Dashboard</h1>
            <p className="font-sans text-xs text-outline">Real-time revenue streams from your public brain</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Hackathon Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/20 border border-secondary/30">
            <Trophy className="text-secondary" size={13} />
            <span className="font-sans text-[10px] text-secondary font-bold uppercase tracking-wider">
              AMD Hackathon
            </span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-gutter py-8 space-y-6 relative z-10 overflow-y-auto">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-tertiary" />
              <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-semibold">Total Revenue</span>
            </div>
            <p className="font-sans text-3xl font-bold text-tertiary font-mono">
              ${parseFloat(earnings?.total_earned_usdc || '0.000').toFixed(3)}
            </p>
            <p className="font-sans text-xs text-outline mt-1 font-medium">USDC on Base Sepolia</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-primary" />
              <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-semibold">Queries Gated</span>
            </div>
            <p className="font-sans text-3xl font-bold text-primary font-mono">
              {earnings?.total_queries || 0}
            </p>
            <p className="font-sans text-xs text-outline mt-1 font-medium">total paid queries received</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-secondary" />
              <span className="font-sans text-[10px] text-outline uppercase tracking-wider font-semibold">Sources Assetized</span>
            </div>
            <p className="font-sans text-3xl font-bold text-secondary font-mono">
              {sourceEarnings.length}
            </p>
            <p className="font-sans text-xs text-outline mt-1 font-medium">files actively monetized</p>
          </div>
        </div>

        {/* Brain share details */}
        {brain ? (
          <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-sans text-sm font-semibold text-on-surface">Your Published Brain Details</h2>
              <span className="text-[10px] bg-secondary-container/20 text-secondary border border-secondary/30 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="font-sans text-base text-on-surface font-semibold">{brain.title}</p>
            {brain.description && (
              <p className="font-sans text-xs text-outline mt-1">{brain.description}</p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
              <code className="font-mono text-xs bg-white/5 border border-white/10 text-primary px-3 py-2 rounded-xl flex-1 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/brain/{brain.public_id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/brain/${brain.public_id}`);
                  toast.success('Share link copied!');
                }}
                className="font-sans text-xs bg-gradient-to-r from-primary to-secondary text-background hover:opacity-90 px-4 py-2 rounded-xl font-bold active:scale-95 transition-all cursor-pointer text-center"
              >
                Copy Link
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 border border-white/10 border-dashed text-center">
            <p className="font-sans text-sm text-outline">
              You have not published your brain yet.{' '}
              <Link href="/" className="text-secondary font-semibold hover:underline">Go to Dashboard</Link>{' '}
              to set up your public profile and start earning.
            </p>
          </div>
        )}

        {/* Per-source breakdown */}
        {sourceEarnings.length > 0 ? (
          <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <h2 className="font-sans text-sm font-bold text-on-surface">Earnings by Source</h2>
              <p className="font-sans text-xs text-outline">Performance metrics of your indexed documents</p>
            </div>
            <div className="divide-y divide-white/10 max-h-[250px] overflow-y-auto pr-1">
              {sourceEarnings.map((src) => (
                <div key={src.source} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={16} className="text-secondary shrink-0" />
                    <span className="font-sans text-sm text-on-surface truncate font-medium">{src.source}</span>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <span className="font-sans text-xs text-outline">{src.query_count} queries</span>
                    <span className="font-sans text-sm font-bold text-tertiary font-mono">${parseFloat(src.earned_usdc).toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Transaction Feed */}
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-lg">
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div>
              <h2 className="font-sans text-sm font-bold text-on-surface">Recent Micro-Transactions</h2>
              <p className="font-sans text-xs text-outline">Autonomous agent & web guest queries feed</p>
            </div>
            <span className="font-sans text-xs text-outline">
              Last {earnings?.transactions?.length || 0} items
            </span>
          </div>

          {earnings && earnings.transactions.length > 0 ? (
            <div className="divide-y divide-white/10 max-h-[350px] overflow-y-auto">
              {[...earnings.transactions].reverse().map((tx, i) => (
                <div key={i} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-on-surface truncate font-semibold">"{tx.question_preview}"</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-[10px] text-outline">
                          <Clock size={11} />
                          <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-outline">
                          <FileText size={11} className="text-secondary" />
                          <span>{tx.sources?.length || 0} contexts cited</span>
                        </div>
                        {tx.tx_hash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-sans text-[10px] text-primary hover:text-primary-container font-semibold flex items-center gap-0.5 transition-all"
                          >
                            Basescan
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="font-sans text-sm font-bold text-tertiary flex-shrink-0 font-mono mt-0.5">
                      +${tx.amount_usdc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-outline font-sans text-sm bg-white/[0.01]">
              No earnings transactions recorded yet.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
