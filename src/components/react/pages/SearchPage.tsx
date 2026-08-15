import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, FileText, BookOpen, Users, Briefcase, Newspaper } from 'lucide-react';
import type { SearchResult } from '../types';

interface SearchPageProps {
  lang: 'zh' | 'en';
}

// Declare Pagefind types (ES module exports)
type PagefindSearchResult = {
  id: string;
  score: number;
  words: number[];
  data: () => Promise<{
    url: string;
    title: string;
    excerpt: string;
    content?: string;
    raw_content?: string;
    raw_url?: string;
    meta?: Record<string, any>;
    anchor?: any;
    sub_results?: Array<{
      title: string;
      url: string;
      excerpt: string;
    }>;
  }>;
};

type PagefindSearchResponse = {
  results: PagefindSearchResult[];
  unfilteredResultCount: number;
  filters: Record<string, Record<string, number>>;
  totalFilters: Record<string, Record<string, number>>;
  timings: {
    preload: number;
    search: number;
    total: number;
  };
};

const TEXT = {
  placeholder: {
    zh: '搜索页面、文档、论文...',
    en: 'Search pages, documents, papers...'
  },
  loading: {
    zh: '搜索中...',
    en: 'Searching...'
  },
  noResults: {
    zh: '未找到结果',
    en: 'No results found'
  },
  results: {
    zh: '搜索结果',
    en: 'Search Results'
  },
  tryDifferent: {
    zh: '尝试使用不同的关键词',
    en: 'Try using different keywords'
  },
  error: {
    zh: '搜索功能暂时不可用',
    en: 'Search is temporarily unavailable'
  }
};

export function SearchPage({ lang }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPagefindLoaded, setIsPagefindLoaded] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load and initialize Pagefind
  useEffect(() => {
    let isMounted = true;

    const loadPagefind = async () => {
      try {
        // Check if Pagefind files exist (only available after build)
        // In dev mode, we need to handle the 404 gracefully
        const checkResponse = await fetch('/pagefind/pagefind-entry.json', { method: 'HEAD' });
        if (!checkResponse.ok) {
          // Pagefind not available (dev mode or not built yet)
          if (isMounted) {
            setError(
              lang === 'zh' 
                ? '搜索功能需要先构建项目（npm run build）后才能使用' 
                : 'Search requires building the project first (npm run build)'
            );
          }
          return;
        }

        // Dynamically import Pagefind at runtime using Function constructor
        // This ensures Vite doesn't try to resolve it at build time
        // The module only exists in dist/pagefind/ after build
        const importPagefind = new Function('path', 'return import(path)');
        const pagefindPath = '/pagefind/pagefind.js';
        const pagefindModule = await importPagefind(pagefindPath);
        
        // Initialize Pagefind
        await pagefindModule.init();
        
        // Store module for later use
        (window as any).__pagefind_module = pagefindModule;
        
        if (isMounted) {
          setIsPagefindLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load or initialize Pagefind:', err);
        if (isMounted) {
          // Provide helpful error message
          const errorMsg = err instanceof Error && err.message.includes('404')
            ? (lang === 'zh' 
                ? '搜索功能需要先构建项目（npm run build）后才能使用' 
                : 'Search requires building the project first (npm run build)')
            : TEXT.error[lang];
          setError(errorMsg);
          setIsPagefindLoaded(false);
        }
      }
    };

    loadPagefind();

    return () => {
      isMounted = false;
    };
  }, [lang]);

  // Perform search when query changes
  useEffect(() => {
    if (!isPagefindLoaded) {
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    if (query.trim().length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Get Pagefind module from window (set during initialization)
        const pagefindModule = (window as any).__pagefind_module;
        if (!pagefindModule) {
          throw new Error('Pagefind module not loaded');
        }
        
        const searchResponse: PagefindSearchResponse = await pagefindModule.search(query.trim());
        
        // Load data for each result (this is async)
        const formattedResults: SearchResult[] = await Promise.all(
          searchResponse.results.map(async (result) => {
            const data = await result.data();
            return {
              id: result.id,
              url: data.url,
              title: extractTitle(data.url, data.meta || {}),
              excerpt: data.excerpt || '',
              meta: data.meta || {}
            };
          })
        );
        
        setResults(formattedResults);
      } catch (err) {
        console.error('Search error:', err);
        setError(TEXT.error[lang]);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isPagefindLoaded, lang]);

  // Extract title from URL or meta
  const extractTitle = (url: string, meta: Record<string, any>): string => {
    if (meta.title) return meta.title;
    
    // Extract from URL path
    const pathSegments = url.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2];
    
    if (lastSegment) {
      return decodeURIComponent(lastSegment)
        .replace(/\.html$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    
    return url;
  };

  // Get icon based on URL pattern
  const getIcon = (url: string) => {
    if (url.includes('/library/')) return <BookOpen className="w-5 h-5" />;
    if (url.includes('/people/')) return <Users className="w-5 h-5" />;
    if (url.includes('/projects/')) return <Briefcase className="w-5 h-5" />;
    if (url.includes('/news/')) return <Newspaper className="w-5 h-5" />;
    if (url.includes('/publications/')) return <FileText className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Search Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
            {lang === 'zh' ? '搜索' : 'Search'}
          </h1>
          <p className="text-lg text-teal-100/80 font-light">
            {lang === 'zh' ? '搜索实验室网站的所有内容' : 'Search all content on the lab website'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={TEXT.placeholder[lang]}
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-12 pr-6 py-4 text-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
            /* This is a dedicated /search route reached by clicking the
               magnifier; typing is its only purpose, so autofocus saves every
               user a second click rather than stealing focus from surrounding
               content. The rule's own docs name this as the exception. */
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {query.trim().length > 0 && !isLoading && !error && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <div className="text-sm text-gray-400">
                  {TEXT.results[lang]} ({results.length})
                </div>
                <div className="space-y-3">
                  {results.map((result) => (
                    <a
                      key={result.id}
                      href={result.url}
                      className="block bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 hover:bg-white/10 hover:border-teal-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1 text-teal-400 group-hover:text-teal-300 transition-colors">
                          {getIcon(result.url)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="text-lg font-medium text-white group-hover:text-teal-300 transition-colors">
                            {result.title}
                          </h3>
                          <p
                            className="text-sm text-gray-300 overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.5',
                              maxHeight: '3em'
                            }}
                            dangerouslySetInnerHTML={{ __html: result.excerpt }}
                          />
                          <div className="text-xs text-gray-500 font-mono">
                            {result.url}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 space-y-2">
                <p className="text-gray-400 text-lg">{TEXT.noResults[lang]}</p>
                <p className="text-gray-500 text-sm">{TEXT.tryDifferent[lang]}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {query.trim().length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">{TEXT.placeholder[lang]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
