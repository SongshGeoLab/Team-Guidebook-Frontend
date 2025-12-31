import type { NewsItem } from '../types';
import { Calendar } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface NewsTimelineProps {
  items: NewsItem[];
}

export function NewsTimeline({ items }: NewsTimelineProps) {
  return (
    <div className="w-full space-y-6">
      {items.map((item, index) => (
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
          </GlassCard>
        </div>
      ))}
    </div>
  );
}


