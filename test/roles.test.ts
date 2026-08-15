import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_LABELS, ROLE_TITLES, compareRoles, normalizeRole } from '../src/utils/roles';

describe('normalizeRole', () => {
  it('accepts a canonical value unchanged', () => {
    expect(normalizeRole('phd')).toBe('phd');
  });

  it('maps the English spellings the vault already used', () => {
    expect(normalizeRole('Professor')).toBe('pi');
    expect(normalizeRole('Principal Investigator')).toBe('pi');
    expect(normalizeRole('PhD Student')).toBe('phd');
    expect(normalizeRole('Master Student')).toBe('master');
    expect(normalizeRole('Postdoc')).toBe('postdoc');
  });

  it('maps the Chinese spellings the vault already used', () => {
    expect(normalizeRole('教授')).toBe('pi');
    expect(normalizeRole('博士生')).toBe('phd');
    expect(normalizeRole('硕士生')).toBe('master');
    expect(normalizeRole('博士后')).toBe('postdoc');
  });

  it('is insensitive to case and surrounding whitespace', () => {
    // ' PhD Student ' used to sort to position 999 and render as its own
    // one-person section, distinct from 'PhD Student'.
    expect(normalizeRole('  ph.d. student  ')).toBe('phd');
    expect(normalizeRole('POSTDOC')).toBe('postdoc');
  });

  it('falls back to `other` instead of throwing on an unrecognised title', () => {
    // Visible in the rendered page, so the author still finds out — but the
    // build does not die over a job title the enum had not anticipated.
    expect(normalizeRole('Chief Vibes Officer')).toBe('other');
  });

  it('treats a missing or empty role as `other`', () => {
    expect(normalizeRole(undefined)).toBe('other');
    expect(normalizeRole('')).toBe('other');
    expect(normalizeRole('   ')).toBe('other');
  });
});

describe('ROLE_LABELS / ROLE_TITLES', () => {
  it('has a heading and a singular title in both locales for every role', () => {
    // Guards the failure where a new ROLES member renders as a blank heading.
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]?.zh, `zh heading for ${role}`).toBeTruthy();
      expect(ROLE_LABELS[role]?.en, `en heading for ${role}`).toBeTruthy();
      expect(ROLE_TITLES[role]?.zh, `zh title for ${role}`).toBeTruthy();
      expect(ROLE_TITLES[role]?.en, `en title for ${role}`).toBeTruthy();
    }
  });

  it('uses a singular English title on a card where the heading is plural', () => {
    // One person's card said "PhD Students" until these tables were split.
    // Chinese does not pluralise, so a single table looked right in review.
    expect(ROLE_LABELS.phd.en).toBe('PhD Students');
    expect(ROLE_TITLES.phd.en).toBe('PhD Student');
    expect(ROLE_TITLES.phd.zh).toBe(ROLE_LABELS.phd.zh);
  });
});

describe('compareRoles', () => {
  it('orders by seniority, with the catch-all last', () => {
    const shuffled = ['other', 'phd', 'pi', 'master', 'postdoc'] as const;
    expect([...shuffled].sort(compareRoles)).toEqual(['pi', 'postdoc', 'phd', 'master', 'other']);
  });
});
