import type { Publication } from '../types';
import { Copy, Download, BookOpen } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface CitationItemProps {
  publication: Publication;
}

export function CitationItem({ publication }: CitationItemProps) {
  const copyBibtex = async () => {
    if (!publication.bibtex) return;
    try {
      await navigator.clipboard.writeText(publication.bibtex);
      alert('BibTeX copied to clipboard');
    } catch {
      alert('Failed to copy BibTeX');
    }
  };

  return (
    <GlassCard className="p-5 rounded-lg">
      <div className="flex flex-col gap-2">
        <h4 className="text-lg font-medium text-white/90 leading-snug">{publication.title}</h4>

        {publication.authors && (
          <div className="text-gray-300 text-sm">{publication.authors.join(', ')}</div>
        )}

        <div className="flex items-center gap-2 text-sm text-teal-400 font-medium mt-1">
          <BookOpen className="w-4 h-4" />
          <span>{publication.venue}</span>
          {publication.year != null && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{publication.year}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
          {publication.bibtex && (
            <button
              onClick={copyBibtex}
              className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              BibTeX
            </button>
          )}

          {publication.url && (
            <a
              href={publication.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </a>
          )}

          {publication.tags && (
            <div className="ml-auto flex gap-2">
              {publication.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-wider text-gray-500 border border-white/10 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}


