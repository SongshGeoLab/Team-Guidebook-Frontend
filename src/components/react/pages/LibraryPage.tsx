import type { LibraryItem } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar } from 'lucide-react';

interface LibraryPageProps {
  lang: 'zh' | 'en';
  items: LibraryItem[];
}

export function LibraryPage({ lang, items }: LibraryPageProps) {
  return (
    <div className="space-y-12">
      <div className="p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
          {lang === 'zh' ? '图书馆' : 'Library'}
        </h1>
        <p className="text-lg text-teal-100/80 font-light">
          {lang === 'zh' ? '长文、随想、技术手册。' : 'Long-form notes, manifestos, and field guides.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item, idx) => (
          <motion.a
            key={item.id}
            href={item.detailUrl || `/${lang}/library/${item.slug}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group cursor-pointer flex flex-col h-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-teal-500/50 transition-all duration-500"
          >
            <div className="p-8 flex flex-col flex-1">
              {item.tags && (
                <div className="flex gap-2 mb-4">
                  {item.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] uppercase tracking-wider text-teal-400/80">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="text-2xl font-light text-white mb-3 group-hover:text-teal-200 transition-colors">
                {item.title}
              </h2>

              {item.description && (
                <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">{item.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-6 border-t border-white/5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-teal-500">
                  {lang === 'zh' ? '阅读' : 'Read'} <ArrowLeft className="w-3 h-3 rotate-180" />
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

