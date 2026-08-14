import type { NewsItem } from '../types';
import { Calendar, MessageSquare } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useState } from 'react';
import { GiscusComments } from './GiscusComments';

interface NewsTimelineProps {
  items: NewsItem[];
  /** Drives date formatting and UI strings; without it both were hardcoded English. */
  lang: 'zh' | 'en';
  /**
   * Giscus configuration for comments
   * If not provided, comments will be disabled
   */
  giscusConfig?: {
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
    lang?: string;
    theme?: string;
  };
}

export function NewsTimeline({ items, lang, giscusConfig }: NewsTimelineProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComments = (itemId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className="w-full space-y-6">
      {items.map((item, index) => {
        const isCommentsExpanded = expandedComments.has(item.id);
        const showComments = giscusConfig && isCommentsExpanded;

        return (
          <div key={item.id} className="relative pl-8 group">
            {index !== items.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-white/10 group-hover:bg-teal-500/30 transition-colors" />
            )}

            <div className="absolute left-[7px] top-2 w-2.5 h-2.5 rounded-full bg-teal-900 border border-teal-500/50 group-hover:bg-teal-400 group-hover:shadow-[0_0_8px_rgba(45,212,191,0.8)] transition-all duration-300" />

            <GlassCard className="p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="text-lg font-medium text-white/90 group-hover:text-teal-200 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center text-xs text-gray-400 font-mono gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div
                className="text-sm text-gray-300 leading-relaxed [&_a.internal-link]:text-teal-400 [&_a.internal-link]:underline [&_a.internal-link]:underline-offset-2 [&_a.internal-link]:decoration-dashed"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />

              {item.relatedPeople && item.relatedPeople.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-400">
                  <span>{lang === 'zh' ? '相关成员' : 'People'}:</span>
                  {item.relatedPeople.map((person) => (
                    <a
                      key={person.url}
                      href={person.url}
                      className="text-teal-400 hover:underline underline-offset-2"
                    >
                      {person.name}
                    </a>
                  ))}
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-950/50 text-teal-300 border border-teal-900/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {giscusConfig && (
                <>
                  <button
                    onClick={() => toggleComments(item.id)}
                    className="mt-4 flex items-center gap-2 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isCommentsExpanded ? 'Hide Comments' : 'Show Comments'}</span>
                  </button>

                  {showComments && (
                    <div className="mt-4">
                      <GiscusComments
                        repo={giscusConfig.repo}
                        repoId={giscusConfig.repoId}
                        category={giscusConfig.category}
                        categoryId={giscusConfig.categoryId}
                        lang={giscusConfig.lang || 'en'}
                        theme={giscusConfig.theme || 'preferred_color_scheme'}
                        mapping="pathname"
                        term={`news-${item.id}`}
                        identifier={`news-${item.id}`}
                      />
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </div>
        );
      })}
    </div>
  );
}


