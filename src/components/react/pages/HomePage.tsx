import type { NewsItem, Project } from '../types';
import { GlassCard } from '../ui/GlassCard';
import { NewsTimeline } from '../ui/NewsTimeline';
import { ArrowRight, Waves } from 'lucide-react';
import { motion } from 'motion/react';

interface HomePageProps {
  lang: 'zh' | 'en';
  news: NewsItem[];
  projects: Project[];
}

const TEXT = {
  // The hero renders the title over two lines, the second one in the gradient
  // accent. Keep the halves here rather than inlining one of them in the JSX —
  // that is how the two ended up duplicating each other.
  titleLead: {
    zh: '进化的',
    en: 'Evolutionary'
  },
  titleAccent: {
    zh: '人与水系统',
    en: 'Human-Water System'
  },
  heroLead: {
    zh: '通过水的视角探索人类社会与自然环境的共演',
    en: 'Exploring the co-evolution between human society and nature through water.'
  },
  featured: { zh: '精选项目', en: 'Featured Projects' },
  news: { zh: '实验室动态', en: 'Lab News' },
  viewAll: { zh: '查看全部', en: 'View All' }
};

export function HomePage({ lang, news, projects }: HomePageProps) {
  const topNews = news.slice(0, 5);
  const featured = projects.slice(0, 3);

  return (
    <div className="space-y-24">
      <section className="min-h-[70vh] flex flex-col justify-center items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-8 max-w-4xl"
        >
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full border border-teal-500/30 bg-teal-950/20 text-teal-300 text-xs tracking-wider uppercase">
              SongshGeo Lab
            </span>
            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400 text-xs tracking-wider uppercase">
              Max Planck Institute of Geoanthropology
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white leading-[1.1] drop-shadow-lg">
            {TEXT.titleLead[lang]}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-400 font-normal">
              {TEXT.titleAccent[lang]}
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-xl font-light leading-relaxed border-l-2 border-teal-500/50 pl-6">
            {TEXT.heroLead[lang]}
          </p>

          <div className="flex gap-4 pt-4">
            <a
              href={`/${lang}/projects/`}
              className="rounded-full bg-white text-black hover:bg-teal-50 px-8 py-4 text-base font-medium transition-transform active:scale-95"
            >
              {TEXT.viewAll[lang]}
            </a>
            <a
              href={`/${lang}/about/`}
              className="bg-transparent rounded-full border border-white/20 text-white hover:bg-white/10 px-8 py-4 text-base font-medium"
            >
              {lang === 'zh' ? '关于实验室' : 'About the Lab'}
            </a>
          </div>
        </motion.div>
      </section>

      <section className="space-y-12 pt-12">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <h2 className="text-3xl font-light text-white">{TEXT.featured[lang]}</h2>
          <a
            href={`/${lang}/projects/`}
            className="flex items-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
          >
            {TEXT.viewAll[lang]} <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((project) => (
            <GlassCard
              key={project.id}
              className="p-6 flex flex-col h-full group"
              onClick={() => window.location.assign(project.detailUrl || `/${lang}/projects/${project.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-teal-500/20 rounded-lg text-teal-300">
                  <Waves className="w-6 h-6" />
                </div>
                {project.tags && project.tags[0] && (
                  <span className="text-xs text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded">
                    {project.tags[0]}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-medium text-white mb-2 group-hover:text-teal-300 transition-colors">
                {project.title}
              </h3>
              {project.summary && (
                <p className="text-sm text-gray-400 mb-4 flex-1">{project.summary}</p>
              )}
              <div className="text-xs text-gray-500 font-mono">
                {project.start_date} {project.end_date ? `- ${project.end_date}` : '- Present'}
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="news-section" className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-12 border-t border-white/10">
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-3xl font-light text-white">{TEXT.news[lang]}</h2>
          <p className="text-gray-400 leading-relaxed">
            {lang === 'zh'
              ? '会议、获奖、工作坊等团队动态。'
              : 'Conference travels, awards, workshops, and team updates.'}
          </p>
          <a
            href={`/${lang}/news/`}
            className="text-teal-400 hover:text-teal-300 text-sm font-medium"
          >
            {lang === 'zh' ? '浏览全部 →' : 'Browse archive →'}
          </a>
        </div>
        <div className="lg:col-span-8">
          <NewsTimeline items={topNews} lang={lang} />
        </div>
      </section>
    </div>
  );
}


