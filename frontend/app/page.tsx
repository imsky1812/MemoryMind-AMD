// frontend/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Brain, Cpu, Sparkles, BookOpen, Clock, Settings, HelpCircle, Menu, X, Trophy } from 'lucide-react';
import { WalletConnect } from '@/components/WalletConnect';
import { UploadZone } from '@/components/UploadZone';
import { SourceList } from '@/components/SourceList';
import { ChatWindow } from '@/components/ChatWindow';
import { StatsBar } from '@/components/StatsBar';
import { useMemoryMint } from '@/hooks/useMemoryMint';

export default function DashboardPage() {
  const {
    sources,
    messages,
    isUploading,
    uploadProgress,
    isQuerying,
    stats,
    isConnected,
    loadSources,
    uploadFile,
    removeSource,
    askQuestion,
    clearChat,
  } = useMemoryMint();

  const [selectedSource, setSelectedSource] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAsk = (question: string) => {
    askQuestion(question, selectedSource);
  };

  return (
    <div className="text-on-surface antialiased overflow-hidden flex h-screen bg-surface-container-lowest font-sans">
      
      {/* SideNavBar Component (Desktop/Tablet) */}
      <nav className={`
        flex flex-col py-8 px-4 gap-6 bg-surface-container/60 backdrop-blur-2xl border-r border-white/10 shadow-2xl fixed left-0 top-0 h-full w-sidebar-width z-40 transition-all duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(172,199,255,0.4)]">
              <Cpu className="text-background" size={20} />
            </div>
            <div>
              <h1 className="font-headline text-on-surface text-xl font-bold leading-tight">MemoryMint</h1>
              <p className="font-sans text-[10px] text-primary uppercase tracking-wider font-bold opacity-80 mt-0.5">
                Second Brain AI
              </p>
            </div>
          </div>
          <button 
            className="md:hidden text-outline hover:text-on-surface p-1 rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div className="mt-4 mb-2">
          <UploadZone
            onFileDrop={uploadFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Navigation Tabs / Scrollable Sources List */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col gap-2">
            <p className="font-sans text-[10px] uppercase tracking-wider font-semibold text-outline mb-2 px-2">
              Knowledge Base
            </p>
            <SourceList 
              sources={sources} 
              onDelete={removeSource} 
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
          </div>
          
          {/* Navigation Links Mock */}
          <div className="flex flex-col gap-2 mt-8">
            <p className="font-sans text-[10px] uppercase tracking-wider font-semibold text-outline mb-2 px-2">
              Navigation
            </p>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-all duration-300 ease-in-out cursor-pointer">
              <Sparkles className="text-xl shrink-0" size={18} />
              <span className="font-sans text-sm">Neural Links</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-all duration-300 ease-in-out cursor-pointer">
              <Clock className="text-xl shrink-0" size={18} />
              <span className="font-sans text-sm">Flashbacks</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-all duration-300 ease-in-out cursor-pointer">
              <Settings className="text-xl shrink-0" size={18} />
              <span className="font-sans text-sm">Settings</span>
            </a>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition-all duration-300 ease-in-out cursor-pointer">
            <HelpCircle className="text-lg shrink-0" size={16} />
            <span className="font-sans text-sm">Support</span>
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:ml-[280px] h-full relative bg-surface-container-lowest">
        
        {/* TopNavBar Component */}
        <header className="flex justify-between items-center w-full px-gutter h-20 fixed top-0 z-30 bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(172,199,255,0.15)] md:w-[calc(100%-280px)] right-0">
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-on-surface p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          
          {/* Stats Cluster */}
          <StatsBar
            sourcesCount={sources.length}
            totalQueries={stats.totalQueries}
            totalEarned={stats.totalEarned}
          />
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Hackathon Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/20 border border-secondary/30">
              <Trophy className="text-secondary" size={13} />
              <span className="font-sans text-[10px] text-secondary font-bold uppercase tracking-wider">
                AMD Hackathon
              </span>
            </div>
            
            {/* Connect Wallet Button */}
            <WalletConnect />
          </div>
        </header>

        {/* Chat Container Window */}
        <div className="flex-1 pt-20 h-full">
          <ChatWindow
            messages={messages}
            onAsk={handleAsk}
            isQuerying={isQuerying}
            isConnected={isConnected}
            selectedSource={selectedSource}
            onClearChat={clearChat}
          />
        </div>
      </main>
      
      {/* Mobile sidebar backdrop overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
