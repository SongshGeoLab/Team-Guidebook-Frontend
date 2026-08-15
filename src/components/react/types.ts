import type { Role } from '../../utils/roles';

/**
 * Props passed from .astro pages into the React islands.
 *
 * These are serialisation shapes, not the schema: dates arrive as ISO strings
 * because that is what crosses the island boundary, and localised fields have
 * already been resolved to one language by the page. Anything that should
 * match content.config.ts is imported from there (see `Role`) rather than
 * restated — restating is how `Project.summary` came to exist here, be
 * rendered by HomePage, and be supplied by nothing.
 */
export interface Person {
  id: string;
  name: string;
  /** Canonical role, for grouping. The free-text job title is `title`. */
  role: Role;
  title?: string;
  status?: 'current' | 'alumni';
  destination?: string;
  avatar?: string;
  email?: string;
  interests?: string[];
  links?: Array<{ label: string; url: string }>;
  detailUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  summary?: string;
  cover?: string;
  start_date?: string;
  end_date?: string;
  people?: string[];
  tags?: string[];
  repo?: string;
  detailUrl?: string;
}

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  content: string;
  tags?: string[];
  related_people?: string[];
  /** Resolved from related_people by the page, so the timeline can link them. */
  relatedPeople?: Array<{ name: string; url: string }>;
}

export interface Publication {
  id: string;
  year?: number;
  title: string;
  authors?: string[];
  venue?: string;
  tags?: string[];
  url?: string;
  bibtex?: string;
}

export interface LibraryItem {
  id: string;
  slug: string;
  title: string;
  date?: string;
  description?: string;
  tags?: string[];
  detailUrl?: string;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  meta?: Record<string, any>;
}


