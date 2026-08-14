/**
 * Date formatting for calendar dates that carry no time-of-day meaning.
 *
 * A daily note called `2025-12-17.md` means that calendar day, everywhere. It
 * was being parsed as UTC midnight and then rendered in the *browser's* zone,
 * so a reader in UTC-5 saw "Dec 16". Meanwhile publicationsLoader built its
 * dates with `new Date(year, 0, 1)` — local midnight — so in UTC+8 a 2024 paper
 * serialised to `2023-12-31`. Two loaders, opposite conventions.
 *
 * The rule here: build and read these dates in UTC, and always format with
 * `timeZone: 'UTC'` so the rendered day matches the filename regardless of
 * where the reader is.
 */

export type Lang = 'zh' | 'en';

const LOCALES: Record<Lang, string> = { zh: 'zh-CN', en: 'en-US' };

export function localeOf(lang: string): string {
  return LOCALES[lang as Lang] ?? LOCALES.en;
}

/** Parse `YYYY-MM-DD` as a UTC calendar date. */
export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(value);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** e.g. 2025年12月17日 / Dec 17, 2025 */
export function formatDay(value: string | Date, lang: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(localeOf(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

/** e.g. 2025年12月 / December 2025 */
export function formatMonth(value: string | Date, lang: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(localeOf(lang), {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  });
}
