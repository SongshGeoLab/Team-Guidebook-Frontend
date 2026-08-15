import type { Lang } from '../i18n/ui';

/**
 * The canonical vocabulary for a lab member's position.
 *
 * `role` used to be free text, and PeoplePage grouped by comparing it against a
 * hardcoded list of ten spellings ('Professor', '教授', 'PhD Student', '博士生',
 * …). Anything not on that list — 'Ph.D. student', '副教授', 'Undergraduate',
 * a trailing space — sorted to position 999 and rendered as its own one-person
 * section, with no error anywhere. A closed vocabulary makes grouping total.
 *
 * The order here IS the display order: PI first, then descending seniority,
 * with the catch-all last.
 */
export const ROLES = [
  'pi',
  'postdoc',
  'phd',
  'master',
  'undergrad',
  'staff',
  'visitor',
  'other',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Section headings, per locale — plural in English.
 *
 * Free-text job titles go in `title`/`title_en`; this is only the group name.
 */
export const ROLE_LABELS: Record<Role, Record<Lang, string>> = {
  pi: { zh: '负责人', en: 'Principal Investigator' },
  postdoc: { zh: '博士后', en: 'Postdocs' },
  phd: { zh: '博士生', en: 'PhD Students' },
  master: { zh: '硕士生', en: 'Master Students' },
  undergrad: { zh: '本科生', en: 'Undergraduates' },
  staff: { zh: '研究人员', en: 'Staff' },
  visitor: { zh: '访问学者', en: 'Visiting Scholars' },
  other: { zh: '其他成员', en: 'Others' },
};

/**
 * The same roles naming one person, for a card subtitle or a detail page.
 *
 * Separate from ROLE_LABELS because English pluralises: a heading over a list
 * says "PhD Students", but one person's card must not. Chinese does not
 * distinguish, so the values coincide there — which is exactly why a single
 * table would have looked correct in review and been wrong in English.
 */
export const ROLE_TITLES: Record<Role, Record<Lang, string>> = {
  pi: { zh: '负责人', en: 'Principal Investigator' },
  postdoc: { zh: '博士后', en: 'Postdoc' },
  phd: { zh: '博士生', en: 'PhD Student' },
  master: { zh: '硕士生', en: 'Master Student' },
  undergrad: { zh: '本科生', en: 'Undergraduate' },
  staff: { zh: '研究人员', en: 'Staff' },
  visitor: { zh: '访问学者', en: 'Visiting Scholar' },
  other: { zh: '成员', en: 'Member' },
};

/** Heading for the alumni section, which cuts across roles. */
export const ALUMNI_LABEL: Record<Lang, string> = { zh: '毕业与离任成员', en: 'Alumni' };

/**
 * Spellings that map onto a canonical role.
 *
 * Deliberately generous, and it includes every value the vault used before this
 * vocabulary existed. Normalising rather than rejecting means adopting the enum
 * does not require rewriting every note in 通讯录/ on the same commit.
 */
const ALIASES: Record<string, Role> = {
  // PI
  pi: 'pi',
  professor: 'pi',
  'principal investigator': 'pi',
  'group leader': 'pi',
  教授: 'pi',
  副教授: 'pi',
  研究员: 'pi',
  负责人: 'pi',
  课题组长: 'pi',
  研究组长: 'pi',
  // Postdoc
  postdoc: 'postdoc',
  'postdoctoral researcher': 'postdoc',
  'post-doc': 'postdoc',
  博士后: 'postdoc',
  // PhD
  phd: 'phd',
  'phd student': 'phd',
  'ph.d. student': 'phd',
  'doctoral student': 'phd',
  博士生: 'phd',
  博士研究生: 'phd',
  // Master
  master: 'master',
  'master student': 'master',
  "master's student": 'master',
  'msc student': 'master',
  硕士生: 'master',
  硕士研究生: 'master',
  // Undergraduate
  undergrad: 'undergrad',
  undergraduate: 'undergrad',
  'undergraduate student': 'undergrad',
  本科生: 'undergrad',
  // Staff
  staff: 'staff',
  engineer: 'staff',
  'research assistant': 'staff',
  科研助理: 'staff',
  工程师: 'staff',
  行政: 'staff',
  // Visitor
  visitor: 'visitor',
  'visiting scholar': 'visitor',
  'visiting student': 'visitor',
  访问学者: 'visitor',
  访问学生: 'visitor',
};

/**
 * Map a frontmatter `role` value onto the canonical vocabulary.
 *
 * Unknown values become `other` rather than throwing. A build that dies because
 * someone wrote a job title the enum had not anticipated is worse than a
 * labelled "Others" section — but `other` is visible in the rendered page, so
 * the mistake still surfaces to whoever wrote it.
 */
export function normalizeRole(raw: string | undefined | null): Role {
  if (!raw) return 'other';
  const key = raw.trim().toLowerCase();
  if ((ROLES as readonly string[]).includes(key)) return key as Role;
  return ALIASES[key] ?? 'other';
}

/** Sort comparator putting roles in ROLES order. */
export function compareRoles(a: Role, b: Role): number {
  return ROLES.indexOf(a) - ROLES.indexOf(b);
}
