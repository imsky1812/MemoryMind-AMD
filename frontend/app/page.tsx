'use client';

import { useState } from 'react';
import { Brain, Zap, X, AlertTriangle } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';
import { UploadZone } from '@/components/UploadZone';
import { SourceList } from '@/components/SourceList';
import { ChatWindow } from '@/components/ChatWindow';
import { StatsBar } from '@/components/StatsBar';
import { useMemoryMint } from '@/hooks/useMemoryMint';

export default function DashboardPage() {
  const {
    sources, messages, isUploading, uploadProgress,
    isQuerying, stats, isConnected,
    uploadFile, removeSource, askQuestion,
  } = useMemoryMint();

  const [duplicateFile, setDuplicateFile] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Brain className="text-blue-400" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">MemoryMint</h1>
            <p className="text-xs text-slate-500">Pay-per-query AI knowledge engine</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-950/50 border border-amber-800/50 rounded-full px-2 py-0.5 ml-2">
            <Zap size={10} className="text-amber-400" />
            <span className="text-amber-400 text-xs">AMD Hackathon</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatsBar
            sourcesCount={sources.length}
            totalQueries={stats.totalQueries}
            totalEarned={stats.totalEarned}
          />
          <WalletConnect />
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">

        {/* Left panel — sources */}
        <aside className="w-80 shrink-0 border-r border-white/5 bg-black/10 backdrop-blur-xl flex flex-col">
          <div className="p-4 space-y-4 border-b border-slate-800">
            <h2 className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Upload Documents
            </h2>
            <UploadZone
  onFileDrop={async (file) => {
    const result = await uploadFile(file);
    if (result && 'duplicate' in result && result.duplicate) {
      setDuplicateFile(result.filename);
    }
  }}
  isUploading={isUploading}
  uploadProgress={uploadProgress}
/>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">
              Your Brain ({sources.length})
            </h2>
            <SourceList sources={sources} onDelete={removeSource} />
          </div>
        </aside>

        {/* Right panel — chat */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="px-4 py-3 border-b border-slate-800 shrink-0">
            <p className="text-slate-500 text-xs">
              Each query: <span className="text-blue-400 font-mono">$0.001 USDC</span> via X402 · Base Sepolia testnet
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <ChatWindow
              messages={messages}
              onAsk={askQuestion}
              isQuerying={isQuerying}
              isConnected={isConnected}
            />
          </div>
        </main>
      </div>

      {/* Duplicate file modal */}
      {/* Duplicate file modal */}
{duplicateFile && (
  <div
    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={() => setDuplicateFile(null)}
  >
    <div
      style={{ backgroundColor: '#dc2626', borderRadius: '16px', padding: '24px', maxWidth: '380px', width: '100%' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <AlertTriangle color="white" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: 0 }}>
            File already exists
          </h3>
          <p style={{ color: '#fecaca', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
            "{duplicateFile}" is already in your brain. Delete it first if you want to re-upload.
          </p>
        </div>
        <button
          onClick={() => setDuplicateFile(null)}
          style={{ color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={18} />
        </button>
      </div>
      <button
        onClick={() => setDuplicateFile(null)}
        style={{
          width: '100%', backgroundColor: 'white', color: '#dc2626',
          fontWeight: 600, fontSize: '14px', border: 'none',
          borderRadius: '10px', padding: '10px', cursor: 'pointer'
        }}
      >
        Got it
      </button>
    </div>
  </div>

)}
    </div>
  );
}