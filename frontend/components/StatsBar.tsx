// frontend/components/StatsBar.tsx

'use client';

import { Database, MessageSquare, Coins } from 'lucide-react';

interface StatsBarProps {
  sourcesCount: number;
  totalQueries: number;
  totalEarned: string;
}

export function StatsBar({ sourcesCount, totalQueries, totalEarned }: StatsBarProps) {
  return (
    <div className="hidden lg:flex items-center gap-6 glass-panel px-4 py-2 rounded-full font-mono text-xs text-on-surface-variant">
      <div className="flex items-center gap-2">
        <Database size={13} className="text-primary" />
        <span>
          Sources: <strong className="text-on-surface">{sourcesCount}</strong>
        </span>
      </div>
      
      <div className="w-px h-4 bg-white/10"></div>
      
      <div className="flex items-center gap-2">
        <MessageSquare size={13} className="text-secondary" />
        <span>
          Queries: <strong className="text-on-surface">{totalQueries}</strong>
        </span>
      </div>
      
      <div className="w-px h-4 bg-white/10"></div>
      
      <div className="flex items-center gap-2">
        <Coins size={13} className="text-tertiary" />
        <span>
          Spent: <strong className="text-on-surface">${totalEarned} USDC</strong>
        </span>
      </div>
    </div>
  );
}
