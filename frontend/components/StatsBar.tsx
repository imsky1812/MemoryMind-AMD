// frontend/components/StatsBar.tsx

'use client';

interface StatsBarProps {
  sourcesCount: number;
  totalQueries: number;
  totalEarned: string;
  payTo?: string;
}

export function StatsBar({ sourcesCount, totalQueries, totalEarned, payTo }: StatsBarProps) {
  const stats = [
    { label: 'Sources', value: sourcesCount.toString() },
    { label: 'Queries this session', value: totalQueries.toString() },
    { label: 'Spent (USDC)', value: `$${totalEarned}` },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-1.5">
          <span className="text-slate-200 text-sm font-semibold tabular-nums">{s.value}</span>
          <span className="text-slate-500 text-xs">{s.label}</span>
        </div>
      ))}
    </div>
  );
}