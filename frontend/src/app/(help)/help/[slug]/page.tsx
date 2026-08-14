'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Loader2, AlertCircle, Clock,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    title: string;
    slug: string;
    icon: string;
  };
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [localHelpful, setLocalHelpful] = useState(0);
  const [localNotHelpful, setLocalNotHelpful] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const art = await apiFetch<HelpArticle>(`/help/articles/${slug}`);
        setArticle(art);
        setLocalHelpful(art.helpful);
        setLocalNotHelpful(art.notHelpful);
        const all = await apiFetch<HelpArticle[]>(`/help/articles?category=${art.category.slug}`);
        setRelated(all.filter((a) => a.slug !== slug).slice(0, 4));
      } catch (e: any) {
        setError(e.message || 'Article not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const handleVote = useCallback(
    async (helpful: boolean) => {
      if (voted || !article) return;
      setVoted(helpful ? 'up' : 'down');
      if (helpful) setLocalHelpful((n) => n + 1);
      else setLocalNotHelpful((n) => n + 1);
      try {
        await apiFetch(`/help/articles/${slug}/helpful`, {
          method: 'POST',
          body: { helpful },
        });
      } catch {
        // optimistic update is fine
      }
    },
    [voted, article, slug]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-9 w-9 text-red-400" />
        <p className="text-sm font-semibold text-[#78716C]">{error || 'Article not found'}</p>
        <button
          onClick={() => router.push('/help')}
          className="mt-2 text-xs font-bold text-[#f97316] hover:underline cursor-pointer"
        >
          Back to Help Center
        </button>
      </div>
    );
  }

  const formattedDate = new Date(article.updatedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.push('/help')}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#78716C] dark:text-zinc-500 hover:text-[#f97316] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            All articles
          </button>
          <span className="text-[#D6D3D1] dark:text-zinc-700">/</span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#78716C] dark:text-zinc-500">
            <DynamicIcon name={article.category.icon} className="h-3 w-3" />
            {article.category.title}
          </span>
        </div>

        {/* Article header */}
        <div className="mb-6 space-y-3">
          <h1 className="text-[1.4rem] font-black leading-tight tracking-tight text-[#1C1917] dark:text-zinc-50">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-sm text-[#78716C] dark:text-zinc-400 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-[#A8A29E]">
            <Clock className="h-3 w-3" />
            <span>Updated {formattedDate}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E7E5E4] dark:border-zinc-800 mb-6" />

        {/* Article body */}
        <div className="article-content mb-8" dangerouslySetInnerHTML={{ __html: article.content }} />

        {/* Divider */}
        <div className="border-t border-[#E7E5E4] dark:border-zinc-800 mb-6" />

        {/* Feedback */}
        <div className="rounded-2xl border border-[#E7E5E4] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 text-center mb-8">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1C1917] dark:text-zinc-200 mb-3">
            Was this helpful?
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleVote(true)}
              disabled={voted !== null}
              className={`flex items-center gap-2 rounded-xl border px-5 py-2 text-xs font-bold transition-all ${
                voted === 'up'
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                  : voted
                  ? 'border-[#E7E5E4] dark:border-zinc-700 text-[#A8A29E] cursor-not-allowed'
                  : 'border-[#E7E5E4] dark:border-zinc-700 text-[#57534E] dark:text-zinc-400 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 cursor-pointer'
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Yes
              {localHelpful > 0 && <span className="opacity-60">({localHelpful})</span>}
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={voted !== null}
              className={`flex items-center gap-2 rounded-xl border px-5 py-2 text-xs font-bold transition-all ${
                voted === 'down'
                  ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400'
                  : voted
                  ? 'border-[#E7E5E4] dark:border-zinc-700 text-[#A8A29E] cursor-not-allowed'
                  : 'border-[#E7E5E4] dark:border-zinc-700 text-[#57534E] dark:text-zinc-400 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 cursor-pointer'
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              No
              {localNotHelpful > 0 && <span className="opacity-60">({localNotHelpful})</span>}
            </button>
          </div>
          {voted && (
            <p className="mt-3 text-xs text-[#A8A29E]">
              {voted === 'up' ? 'Thanks for the feedback!' : "We'll work on improving this."}
            </p>
          )}
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div className="space-y-2.5 mb-10">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#A8A29E] mb-3">
              More in {article.category.title}
            </p>
            {related.map((rel) => (
              <button
                key={rel.id}
                onClick={() => router.push(`/help/${rel.slug}`)}
                className="group w-full flex items-center justify-between gap-4 rounded-xl border border-[#E7E5E4] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-left hover:border-[#f97316]/50 hover:shadow-sm transition-all cursor-pointer"
              >
                <p className="text-xs font-bold text-[#1C1917] dark:text-zinc-200 group-hover:text-[#f97316] transition-colors">
                  {rel.title}
                </p>
                <LucideIcons.ChevronRight className="h-3.5 w-3.5 text-[#D6D3D1] dark:text-zinc-600 group-hover:text-[#f97316] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
