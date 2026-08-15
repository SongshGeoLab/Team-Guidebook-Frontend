import { describe, expect, it } from 'vitest';
import { formatDay, formatMonth, localeOf, parseCalendarDate } from '../src/utils/formatDate';

/**
 * These tests exist to pin the UTC convention. The regression they guard:
 * a daily note `2025-12-17.md` parsed as UTC midnight but rendered in the
 * reader's zone showed "Dec 16" west of Greenwich, and publicationsLoader's
 * `new Date(year, 0, 1)` (local midnight) serialised a 2024 paper as
 * 2023-12-31 in UTC+8.
 */

describe('parseCalendarDate', () => {
  it('parses YYYY-MM-DD as UTC midnight, not local midnight', () => {
    const date = parseCalendarDate('2025-12-17');
    expect(date.toISOString()).toBe('2025-12-17T00:00:00.000Z');
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseCalendarDate('  2024-01-15 ').toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('falls back to Date parsing for anything that is not a calendar date', () => {
    expect(parseCalendarDate('2024-01-15T10:30:00Z').toISOString()).toBe(
      '2024-01-15T10:30:00.000Z',
    );
  });

  it('returns an invalid Date rather than throwing on garbage', () => {
    expect(Number.isNaN(parseCalendarDate('not a date').getTime())).toBe(true);
  });
});

describe('formatDay', () => {
  it('renders the calendar day from the filename regardless of host timezone', () => {
    // Would be "Dec 16" if the UTC timeZone option were dropped and the test
    // machine sat west of Greenwich.
    expect(formatDay(parseCalendarDate('2025-12-17'), 'en')).toBe('Dec 17, 2025');
  });

  it('renders the same instant as the same day in Chinese', () => {
    expect(formatDay(parseCalendarDate('2025-12-17'), 'zh')).toBe('2025年12月17日');
  });

  it('formats the UTC-midnight dates publicationsLoader builds', () => {
    expect(formatDay(new Date(Date.UTC(2024, 0, 1)), 'en')).toBe('Jan 1, 2024');
  });

  it('echoes the input back instead of rendering "Invalid Date"', () => {
    expect(formatDay('nonsense', 'en')).toBe('nonsense');
  });
});

describe('formatMonth', () => {
  it('renders year and month only', () => {
    expect(formatMonth(parseCalendarDate('2025-12-17'), 'en')).toBe('December 2025');
    expect(formatMonth(parseCalendarDate('2025-12-17'), 'zh')).toBe('2025年12月');
  });
});

describe('localeOf', () => {
  it('maps app locales to BCP 47 tags', () => {
    expect(localeOf('zh')).toBe('zh-CN');
    expect(localeOf('en')).toBe('en-US');
  });

  it('falls back to English for an unknown locale', () => {
    expect(localeOf('fr')).toBe('en-US');
  });
});
