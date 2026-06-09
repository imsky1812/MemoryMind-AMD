'use client';

import { FileText, Trash2, Layers } from 'lucide-react';

interface SourceListProps {
  sources: any[];
  onDelete: (filename: string) => void;
}

export function SourceList({ sources, onDelete }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No documents yet. Upload something to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source, index) => {
        const filename = typeof source === 'string' ? source : source?.filename;
        if (!filename) return null;

        return (
          <div
            key={`${filename}-${index}`}
            className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="text-blue-400 shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">{filename}</p>
              </div>
            </div>
            <button
              onClick={() => onDelete(filename)}
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove source"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}