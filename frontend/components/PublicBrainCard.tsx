// frontend/components/PublicBrainCard.tsx

'use client';

import { useState } from 'react';
import { Globe, Copy, Check, EyeOff, ExternalLink } from 'lucide-react';
import { publishBrain, unpublishBrain } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface Props {
  userId: string;
  brain: any;
  onBrainChange: (brain: any) => void;
}

export function PublicBrainCard({ userId, brain, onBrainChange }: Props) {
  const [title, setTitle] = useState(brain?.title || '');
  const [description, setDescription] = useState(brain?.description || '');
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(!brain);

  const shareUrl = brain
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/brain/${brain.public_id}`
    : '';

  async function handlePublish() {
    if (!title.trim()) {
      toast.error('Give your brain a title first');
      return;
    }
    setIsPublishing(true);
    try {
      const result = await publishBrain(userId, title, description);
      onBrainChange(result.brain);
      setShowForm(false);
      toast.success('Brain published! Share the link to start earning.');
    } catch (err) {
      toast.error('Failed to publish brain');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    try {
      await unpublishBrain(userId);
      onBrainChange(null);
      setShowForm(true);
      toast.success('Brain unpublished');
    } catch (err) {
      toast.error('Failed to unpublish');
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={16} className="text-primary" />
        <h3 className="font-sans text-xs font-semibold text-outline uppercase tracking-wider">
          Public Brain
        </h3>
        {brain && (
          <span className="ml-auto text-[10px] bg-secondary-container/20 text-secondary border border-secondary/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
            Live
          </span>
        )}
      </div>

      {showForm ? (
        <div className="space-y-3">
          <p className="font-sans text-xs text-outline leading-relaxed">
            Publish your knowledge base so others can query it. Every query pays you $0.001 USDC.
          </p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brain title e.g. My Study Notes"
            className="w-full font-sans bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full font-sans bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
          />
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full font-sans bg-gradient-to-r from-primary to-secondary text-background hover:opacity-90 disabled:opacity-50 text-xs py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(172,199,255,0.2)] active:scale-95 cursor-pointer"
          >
            {isPublishing ? 'Publishing...' : 'Publish Brain & Start Earning'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-sans text-sm text-on-surface font-semibold truncate">{brain?.title}</p>
          {brain?.description && (
            <p className="font-sans text-xs text-outline leading-relaxed">{brain.description}</p>
          )}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
            <code className="font-mono text-xs text-primary/80 truncate flex-1 select-all">
              {shareUrl}
            </code>
            <button 
              onClick={copyLink} 
              className="text-outline hover:text-on-surface p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="Copy share link"
            >
              {copied ? <Check size={14} className="text-tertiary" /> : <Copy size={14} />}
            </button>
            <Link 
              href={`/brain/${brain?.public_id}`} 
              target="_blank"
              className="text-outline hover:text-on-surface p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="View public brain"
            >
              <ExternalLink size={14} />
            </Link>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Link 
              href="/earnings" 
              className="font-sans text-xs text-secondary font-semibold hover:text-secondary-container transition-colors"
            >
              View Earnings →
            </Link>
            <button
              onClick={handleUnpublish}
              className="font-sans text-xs text-outline hover:text-error flex items-center gap-1 transition-colors cursor-pointer"
            >
              <EyeOff size={12} />
              Unpublish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
