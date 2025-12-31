import type { NewsItem } from '../types';
import { useState } from 'react';
import { NewsTimeline } from '../ui/NewsTimeline';
import { NewsCalendar } from '../ui/NewsCalendar';
import { Calendar as CalendarIcon, List } from 'lucide-react';

interface NewsPageProps {
  lang: 'zh' | 'en';
  news: NewsItem[];
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

export function NewsPage({ lang, news, giscusConfig }: NewsPageProps) {
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');

  // Merge lang into giscus config if provided
  const finalGiscusConfig = giscusConfig
    ? {
        ...giscusConfig,
        lang: giscusConfig.lang || lang
      }
    : undefined;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
            {lang === 'zh' ? '实验室动态' : 'Lab News'}
          </h1>
          <p className="text-lg text-teal-100/80 mt-2 font-light">
            {lang === 'zh' ? '旅行、获奖、活动与公告。' : 'Travel, awards, workshops, and announcements.'}
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setView('timeline')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all ${
              view === 'timeline' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Timeline
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-all ${
              view === 'calendar' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </button>
        </div>
      </div>

      {view === 'timeline' ? (
        <NewsTimeline items={news} giscusConfig={finalGiscusConfig} />
      ) : (
        <NewsCalendar items={news} />
      )}
    </div>
  );
}


