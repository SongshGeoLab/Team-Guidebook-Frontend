import type { Publication } from '../types';
import { useMemo, useState } from 'react';
import { CitationItem } from '../ui/CitationItem';
import { Search } from 'lucide-react';

interface PublicationsPageProps {
  lang: 'zh' | 'en';
  publications: Publication[];
}

export function PublicationsPage({ lang, publications }: PublicationsPageProps) {
  const [activeTag, setActiveTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(publications.flatMap((p) => p.tags || [])))],
    [publications]
  );

  // Entries with no parseable year used to vanish: the page renders only by
  // iterating `years`, so they matched no bucket — while still counting toward
  // `filtered.length`, which suppressed the empty state too. Result: a blank
  // column with no explanation. They now get their own "n.d." group.
  const years = useMemo(
    () => Array.from(new Set(publications.map((p) => p.year).filter(Boolean) as number[])).sort((a, b) => b - a),
    [publications]
  );

  const filtered = publications.filter((pub) => {
    const matchesTag = activeTag === 'All' || (pub.tags || []).includes(activeTag);
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      pub.title.toLowerCase().includes(query) ||
      (pub.authors || []).some((a) => a.toLowerCase().includes(query));
    return matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8 justify-between items-end p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
            {lang === 'zh' ? '出版物' : 'Publications'}
          </h1>
          <p className="text-lg text-teal-100/80 font-light">
            {lang === 'zh' ? '论文、会议与报告' : 'Peer-reviewed articles and conference papers.'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={lang === 'zh' ? '搜索论文…' : 'Search papers…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
              {lang === 'zh' ? '主题' : 'Topics'}
            </h3>
            <div className="flex flex-col gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`text-left text-sm py-1 px-2 -mx-2 rounded transition-colors ${
                    activeTag === tag
                      ? 'text-teal-300 bg-white/5 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-12">
          {(() => {
            const undated = filtered.filter((p) => !p.year);
            return undated.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-light text-white/70 border-b border-white/5 pb-2">
                  {lang === 'zh' ? '年份不详' : 'n.d.'}
                </h2>
                <div className="space-y-4">
                  {undated.map((pub) => (
                    <CitationItem key={pub.id} publication={pub} lang={lang} />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {years.map((year) => {
            const yearPubs = filtered.filter((p) => p.year === year);
            if (yearPubs.length === 0) return null;
            return (
              <div key={year} className="space-y-6">
                <h2 className="text-2xl font-light text-white/70 border-b border-white/5 pb-2">{year}</h2>
                <div className="space-y-4">
                  {yearPubs.map((pub) => (
                    <CitationItem key={pub.id} publication={pub} lang={lang} />
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              {lang === 'zh' ? '没有匹配的出版物' : 'No publications found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


