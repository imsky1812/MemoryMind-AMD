// frontend/components/SourceList.tsx

'use client';

import { Source } from '@/types';
import { FileText, Trash2, FileCode } from 'lucide-react';

interface SourceListProps {
  sources: Source[];
  onDelete: (filename: string) => void;
  selectedSource?: string;
  onSelectSource?: (filename: string | undefined) => void;
}

export function SourceList({ sources, onDelete, selectedSource, onSelectSource }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-outline text-sm font-sans">
        No documents yet. Drag & drop files to index them.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sources.map((source) => {
        const isPdf = source.filename.toLowerCase().endsWith('.pdf');
        const isSelected = selectedSource === source.filename;
        
        return (
          <div
            key={source.filename}
            onClick={() => onSelectSource && onSelectSource(isSelected ? undefined : source.filename)}
            className={`
              flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 ease-in-out group cursor-pointer
              ${isSelected 
                ? 'bg-white/5 border-l-2 border-primary text-primary' 
                : 'text-on-surface-variant hover:bg-white/10 hover:text-on-surface'
              }
            `}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {isPdf ? (
                <FileText className="text-xl shrink-0 text-primary" size={20} />
              ) : (
                <FileCode className="text-xl shrink-0 text-secondary" size={20} />
              )}
              <div className="truncate">
                <p className="font-sans text-sm truncate font-medium">{source.filename}</p>
                <p className="font-sans text-xs text-outline mt-0.5 uppercase tracking-wider">
                  {source.chunks} chunks
                </p>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(source.filename);
              }}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-outline hover:text-error p-1 rounded hover:bg-white/5"
              title="Delete source"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
