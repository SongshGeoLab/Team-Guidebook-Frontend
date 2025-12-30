import type { ReactNode } from 'react';
import { Github } from 'lucide-react';
import clsx from 'clsx';

interface ReactBaseLayoutProps {
  children: ReactNode;
  lang: 'zh' | 'en';
  activePage?: string;
}

// Preserve visual richness without WebGL by using a local image + animated gradient overlay
const BG_IMAGE = '/background.jpg';

const navItems = [
  { id: 'home', label: { zh: '首页', en: 'Home' }, path: '' },
  { id: 'news', label: { zh: '动态', en: 'News' }, path: 'news' },
  { id: 'projects', label: { zh: '项目', en: 'Projects' }, path: 'projects' },
  { id: 'library', label: { zh: '图书馆', en: 'Library' }, path: 'library' },
  { id: 'publications', label: { zh: '出版物', en: 'Publications' }, path: 'publications' },
  { id: 'people', label: { zh: '团队', en: 'People' }, path: 'people' },
  { id: 'about', label: { zh: '关于', en: 'About' }, path: 'about' }
];

export function ReactBaseLayout({ children, lang, activePage = 'home' }: ReactBaseLayoutProps) {
  const langPrefix = `/${lang}`;
  const otherLang = lang === 'zh' ? 'en' : 'zh';

  return (
    <div className="relative w-full min-h-screen text-white font-sans selection:bg-teal-500/30 flex flex-col">
      {/* Background layer */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0a1f36cc] via-[#050b14cc] to-[#02040acc] animate-[pulse_10s_ease-in-out_infinite]" />

      <header className="relative z-10 flex justify-between items-center px-6 py-6 md:px-12 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <a href={`${langPrefix}/`} className="flex items-center gap-3">
          <span className="font-medium tracking-wide text-sm md:text-base opacity-90 hover:text-teal-200 transition-colors">
            SongshGeo Lab
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/80">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`${langPrefix}/${item.path}${item.path ? '/' : ''}`}
              className={clsx(
                'hover:text-teal-200 transition-colors',
                activePage === item.id && 'text-teal-300'
              )}
            >
              {item.label[lang]}
            </a>
          ))}
          <div className="h-4 w-px bg-white/20 mx-2" />
          <a
            href="https://github.com"
            className="flex items-center gap-2 text-xs font-bold text-white/90 hover:text-teal-300 transition-colors border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/10 hover:border-white/40"
          >
            <Github className="w-3 h-3" />
            GitHub
          </a>
          <div className="h-4 w-px bg-white/20 mx-2" />
          <a
            href={`/${otherLang}/`}
            className="text-xs font-bold text-white/90 hover:text-teal-300"
          >
            {otherLang.toUpperCase()}
          </a>
        </nav>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto pt-24 pb-12 px-6 md:px-12 flex flex-col">
        {children}
      </main>

      <footer className="relative z-10 w-full border-t border-white/10 mt-auto bg-[#02040a]/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-6">
            <a href="https://github.com" className="hover:text-teal-300 transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <div className="h-4 w-px bg-white/20 mx-2" />
            <a
              href="https://forms.gle"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:text-teal-300 transition-colors flex items-center gap-1"
            >
              {lang === 'zh' ? '订阅' : 'Newsletter'}
            </a>
          </div>
          <div className="text-xs tracking-wider uppercase opacity-80">
            © 2024 SongshGeo Lab
          </div>
        </div>
      </footer>
    </div>
  );
}

