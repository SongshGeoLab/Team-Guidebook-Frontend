export interface Person {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  interests?: string[];
  links?: Array<{ label: string; url: string }>;
  detailUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  people?: string[];
  tags?: string[];
  repo?: string;
  detailUrl?: string;
  summary?: string;
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


