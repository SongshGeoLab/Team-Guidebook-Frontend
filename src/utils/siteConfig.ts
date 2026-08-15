import { getEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

/**
 * Site identity, resolved for one locale.
 *
 * Every consumer wants the same thing — "the lab's name, in this language,
 * definitely a string" — so the localisation and the fallbacks happen once,
 * here. Components that reach into `entry.data.name_en ?? entry.data.name`
 * themselves are how the three conflicting identities happened in the first
 * place.
 */
export interface ResolvedSite {
  name: string;
  tagline?: string;
  headline?: string;
  headlineAccent?: string;
  affiliation?: string;
  logo?: string;
  email?: string;
  address?: string;
  socials: Array<{ label: string; url: string; icon?: string }>;
  nav?: Array<{ href: string; label: string }>;
  footerNote?: string;
}

/**
 * Fallback used when the vault has no site.md.
 *
 * Deliberately generic. A placeholder that named a specific lab would look
 * correct on someone else's deployment and never get replaced — which is the
 * failure mode this whole module exists to end.
 */
const FALLBACK: Record<Lang, { name: string }> = {
  zh: { name: '实验室' },
  en: { name: 'Lab' },
};

/** Pick `field_en` for English when present, else the base (Chinese) field. */
function pick<T extends Record<string, unknown>>(
  data: T,
  field: string,
  lang: Lang
): string | undefined {
  const base = data[field];
  if (lang === 'en') {
    const translated = data[`${field}_en`];
    if (typeof translated === 'string' && translated.trim()) return translated;
  }
  return typeof base === 'string' && base.trim() ? base : undefined;
}

export async function getSiteConfig(lang: Lang): Promise<ResolvedSite> {
  const entry = await getEntry('site', 'site');
  if (!entry) return { ...FALLBACK[lang], socials: [] };

  const d = entry.data;
  return {
    name: pick(d, 'name', lang) ?? FALLBACK[lang].name,
    tagline: pick(d, 'tagline', lang),
    headline: pick(d, 'headline', lang),
    headlineAccent: pick(d, 'headline_accent', lang),
    affiliation: pick(d, 'affiliation', lang),
    logo: d.logo,
    email: d.email,
    address: pick(d, 'address', lang),
    socials: d.socials ?? [],
    nav: d.nav?.map((item) => ({
      href: item.href,
      label: (lang === 'en' && item.label_en) || item.label,
    })),
    footerNote: pick(d, 'footer_note', lang),
  };
}
