'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface HelpCategory {
  id: string;
  title: string;
  slug: string;
  icon: string;
  order: number;
  articleCount: number;
}

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categoryId: string;
  category: { title: string; slug: string; icon: string };
  createdAt: string;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name] || HelpCircle;
  return <Icon className={className} />;
};

export default function HelpCenterPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, arts] = await Promise.all([
          apiFetch<HelpCategory[]>('/help/categories'),
          apiFetch<HelpArticle[]>('/help/articles'),
        ]);
        setCategories(cats);
        setArticles(arts);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load help content');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = query.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          (a.excerpt || '').toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const articlesByCategory = (categoryId: string) =>
    articles.filter((a) => a.categoryId === categoryId);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#3b5a73]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-9 w-9 text-red-400" />
        <p className="text-sm font-semibold text-[#78716C]">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero search ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-[#FAFAF9] dark:from-brand-950/20 dark:to-zinc-950 border-b border-[#E7E5E4] dark:border-zinc-800 px-4 pb-0 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#3b5a73]">
            Help Center
          </p>
          <h1 className="text-[1.75rem] font-black leading-tight tracking-tight text-[#1C1917] dark:text-zinc-50">
            How can we help?
          </h1>
          <p className="mt-1.5 text-sm text-[#78716C] dark:text-zinc-400">
            Guides and answers for every part of KhaoPio.
          </p>

          {/* Search input */}
          <div className="relative mt-5 mb-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search articles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#E7E5E4] dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-11 pr-4 py-3.5 text-sm font-medium text-[#1C1917] dark:text-zinc-100 placeholder:text-[#A8A29E] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3b5a73]/40 focus:border-[#3b5a73] dark:focus:border-[#3b5a73] transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E7E5E4] dark:bg-zinc-700 text-[#78716C] hover:bg-[#3b5a73] hover:text-white transition-colors cursor-pointer"
              >
                <LucideIcons.X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category pill strip */}
          {!query && (
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeCategory === cat.id
                      ? 'border-[#3b5a73] bg-[#3b5a73] text-white shadow-sm'
                      : 'border-[#E7E5E4] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#57534E] dark:text-zinc-400 hover:border-[#3b5a73] hover:text-[#3b5a73]'
                  }`}
                >
                  <DynamicIcon name={cat.icon} className="h-3 w-3" />
                  {cat.title}
                  <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ${
                    activeCategory === cat.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F5F5F4] dark:bg-zinc-800 text-[#A8A29E]'
                  }`}>
                    {cat.articleCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search results ── */}
      {query.trim() && (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#A8A29E]">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E5E4] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#78716C]">No articles match that search.</p>
              <p className="mt-1 text-xs text-[#A8A29E]">Try shorter keywords or browse by category below.</p>
            </div>
          ) : (
            filtered.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                onClick={() => router.push(`/help/${article.slug}`)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Articles by category ── */}
      {!query.trim() && (
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">
          {categories.map((cat) => {
            const catArticles = articlesByCategory(cat.id);
            if (catArticles.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="space-y-2.5 scroll-mt-16">
                {/* Section label */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3b5a73] text-white">
                    <DynamicIcon name={cat.icon} className="h-3 w-3" />
                  </div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1C1917] dark:text-zinc-200">
                    {cat.title}
                  </h2>
                  <div className="flex-1 border-t border-[#E7E5E4] dark:border-zinc-800" />
                </div>

                {catArticles.map((article) => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    onClick={() => router.push(`/help/${article.slug}`)}
                  />
                ))}
              </section>
            );
          })}

          {/* Bottom padding */}
          <div className="pb-8" />
        </div>
      )}
    </div>
  );
}

function ArticleRow({
  article,
  onClick,
}: {
  article: HelpArticle;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center justify-between gap-4 rounded-xl border border-[#E7E5E4] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 text-left hover:border-[#3b5a73]/50 hover:shadow-sm hover:shadow-brand-100/60 dark:hover:shadow-none transition-all cursor-pointer"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#1C1917] dark:text-zinc-100 group-hover:text-[#3b5a73] transition-colors leading-snug">
          {article.title}
        </p>
        {article.excerpt && (
          <p className="mt-0.5 text-xs text-[#78716C] dark:text-zinc-500 line-clamp-1 leading-relaxed">
            {article.excerpt}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-[#D6D3D1] dark:text-zinc-600 group-hover:text-[#3b5a73] group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
