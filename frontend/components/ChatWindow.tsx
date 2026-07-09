// frontend/components/ChatWindow.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { PaymentReceiptBadge } from './PaymentReceipt';
import { Send, Brain, Paperclip, Loader2, FileText } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  onAsk: (question: string) => void;
  isQuerying: boolean;
  isConnected: boolean;
  selectedSource?: string;
  onClearChat?: () => void;
}

export function ChatWindow({ 
  messages, 
  onAsk, 
  isQuerying, 
  isConnected,
  selectedSource,
  onClearChat
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const q = input.trim();
    if (!q || isQuerying) return;
    setInput('');
    onAsk(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pt-6 pb-32 px-4 md:px-margin-desktop scroll-smooth min-h-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          {/* Welcome / Initial State */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_20px_rgba(172,199,255,0.3)] animate-pulse">
                <Brain className="text-background" size={32} />
              </div>
              <div>
                <h3 className="font-headline text-xl text-on-surface font-semibold">MemoryMint AI Brain</h3>
                <p className="font-sans text-sm text-outline max-w-sm mt-2">
                  Ask questions about your uploaded memory chunks. Each query costs $0.001 USDC on Base Sepolia.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Divider for today */}
              <div className="text-center my-2">
                <span className="font-sans text-xs text-outline-variant bg-surface-container px-4 py-1 rounded-full border border-white/5 uppercase tracking-wider">
                  Session Chat
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'user' ? (
                    /* User Message styling */
                    <div className="glass-card max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tr-sm p-5 bg-primary/10 border-primary/20">
                      <p className="font-sans text-[15px] text-on-surface leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    /* AI Assistant Message styling */
                    <div className="glass-card max-w-[95%] md:max-w-[85%] rounded-2xl rounded-tl-sm p-6 relative bg-surface-container-lowest">
                      
                      {/* Loading/Thinking dots inside card */}
                      {msg.isLoading && (
                        <div className="absolute -top-3 left-4 glass-panel px-3 py-1 rounded-full flex items-center gap-1.5">
                          <span className="font-sans text-xs text-primary font-medium flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            Thinking
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <Brain className="text-background" size={16} />
                        </div>
                        <span className="font-sans text-xs uppercase tracking-wider text-primary font-semibold">
                          MemoryMint AI
                        </span>
                      </div>

                      <div className="font-sans text-[15px] text-on-surface-variant leading-relaxed space-y-4">
                        {msg.isLoading ? (
                          <div className="flex gap-1 py-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>

                      {/* Citations list */}
                      {!msg.isLoading && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 bg-surface-container-low hover:bg-white/10 transition-colors cursor-pointer text-outline hover:text-on-surface"
                            >
                              <FileText size={12} className="text-primary" />
                              <span className="font-mono text-xs">{src}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Payment receipt overlay */}
                      {!msg.isLoading && msg.receipt && (
                        <PaymentReceiptBadge receipt={msg.receipt} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input controls fixed at bottom of page panel */}
      <div className="absolute bottom-0 left-0 w-full p-4 md:px-margin-desktop md:pb-8 bg-gradient-to-t from-background via-background/90 to-transparent z-10">
        <div className="max-w-4xl mx-auto relative">
          
          {selectedSource && (
            <div className="flex items-center justify-between bg-surface-container-low border border-primary/20 rounded-t-xl px-4 py-2 -mb-1 text-xs text-primary z-0">
              <span className="flex items-center gap-1.5 font-sans">
                <FileText size={12} />
                Filtering query to: <strong className="text-on-surface">{selectedSource}</strong>
              </span>
            </div>
          )}

          <div className="glass-card rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/50 focus-within:shadow-[0_0_20px_rgba(172,199,255,0.2)] border border-white/10 transition-all duration-300">
            <button className="p-3 text-outline hover:text-primary transition-colors rounded-xl hover:bg-white/5 shrink-0">
              <Paperclip size={18} />
            </button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!mounted || !isConnected || isQuerying}
              placeholder={
                (!mounted || !isConnected)
                  ? 'Connect wallet first to access memories...' 
                  : selectedSource 
                    ? `Ask about ${selectedSource}...`
                    : 'Ask your second brain...'
              }
              rows={1}
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 text-on-surface font-sans text-sm placeholder-outline-variant outline-none"
              style={{ overflowY: 'hidden' }}
            />
            
            <button
              onClick={handleSubmit}
              disabled={!mounted || !isConnected || isQuerying || !input.trim()}
              className="p-3 bg-gradient-to-r from-primary to-secondary text-background rounded-xl hover:opacity-90 transition-opacity shrink-0 shadow-[0_0_15px_rgba(172,199,255,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isQuerying ? (
                <Loader2 size={18} className="animate-spin text-background" />
              ) : (
                <Send size={18} className="font-bold text-background" />
              )}
            </button>
          </div>
          
          <div className="text-center mt-2 flex justify-between px-2">
            <span className="font-sans text-[10px] text-outline-variant">
              Powered by MemoryMint Knowledge Graph • 0.001 USDC per query
            </span>
            {messages.length > 0 && (
              <button 
                onClick={onClearChat}
                className="font-sans text-[10px] text-outline hover:text-primary underline cursor-pointer"
              >
                Clear Conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
