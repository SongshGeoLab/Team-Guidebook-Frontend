import type { NewsItem } from '../types';
import { CalendarDays } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { formatDay, formatMonth } from '../../../utils/formatDate';

interface NewsCalendarProps {
  items: NewsItem[];
  /** Without this the month headings were hardcoded en-US and the day
   *  labels used the visitor's own locale — three formats on one screen. */
  lang: 'zh' | 'en';
}

export function NewsCalendar({ items, lang }: NewsCalendarProps) {
  const byMonth = items.reduce<Record<string, NewsItem[]>>((acc, item) => {
    const month = formatMonth(item.date, lang);
    acc[month] = acc[month] || [];
    acc[month].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byMonth).map(([month, list]) => (
        <GlassCard key={month} className="p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            {month}
          </div>
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id} className="text-white/90">
                <div className="text-sm text-gray-400">
                  {formatDay(item.date, lang)}
                </div>
                <div className="font-medium">{item.title}</div>
              </li>
            ))}
          </ul>
        </GlassCard>
      ))}
    </div>
  );
}


