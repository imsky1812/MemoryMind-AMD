// frontend/components/ChatWindow.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types';
import { PaymentReceiptBadge } from './PaymentReceipt';
import { Send, Loader2, Brain } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  onAsk: (question: string) => void;
  isQuerying: boolean;
  isConnected: boolean;
}

export function ChatWindow({ messages, onAsk, isQuerying, isConnected }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  <div className="relative h-full flex flex-col">
    
    {/* background only */}
    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:20px_20px]" />

    {/* REAL UI ON TOP */}
    <div className="relative flex flex-col h-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Brain className="text-slate-600" size={40} />
            <p className="text-slate-500 text-sm max-w-xs">
              Ask anything about your uploaded documents.
              Each query costs $0.001 USDC — paid from your wallet.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-sm shadow-md shadow-blue-500/20'
                    : 'bg-slate-900/60 border border-white/5 backdrop-blur-xl text-slate-100 rounded-bl-sm shadow-lg shadow-black/20'
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-blue-400">
  <div className="flex gap-1">
    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
  </div>

  <span className="text-xs text-slate-400">
    Thinking...
  </span>
</div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Inline citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-1">Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((src, i) => (
                            <span
                              key={i}
                              className="text-xs bg-slate-700/60 text-slate-400 rounded px-2 py-0.5"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment receipt */}
                    {msg.receipt && (
                      <PaymentReceiptBadge receipt={msg.receipt} />
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-slate-800">
        {!isConnected && (
          <p className="text-center text-yellow-500/80 text-xs mb-2">
            Connect your wallet to ask questions
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask a question... (Enter to send)' : 'Connect wallet first'}
            disabled={!isConnected || isQuerying}
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!isConnected || isQuerying || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
          >
            {isQuerying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}