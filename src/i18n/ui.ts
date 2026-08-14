/**
 * Every user-facing string that the page shell needs, in one place.
 *
 * Before this, 22 page titles and descriptions were hardcoded across two
 * parallel route trees, and components carried their own ad-hoc `TEXT`
 * dictionaries plus inline `lang === 'zh' ? … : …` ternaries. Same concept,
 * several implementations — which is how `' - Present'` ended up hardcoded in
 * the React tree while the .astro detail page correctly said `' - 至今'`.
 */

export const LOCALES = ['zh', 'en'] as const;
export type Lang = (typeof LOCALES)[number];

/** The locale `/` redirects to. Mirrors `redirects` in astro.config.mjs. */
export const DEFAULT_LOCALE: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

type Dict = Record<Lang, string>;

export const ui = {
  home: {
    title: { zh: '实验室主页', en: 'Lab Home' } satisfies Dict,
    description: {
      zh: '欢迎来到我们的研究实验室',
      en: 'Welcome to our research lab'
    } satisfies Dict
  },
  people: {
    title: { zh: '团队成员', en: 'People' } satisfies Dict,
    description: { zh: '实验室成员列表', en: 'Lab members' } satisfies Dict
  },
  projects: {
    title: { zh: '研究项目', en: 'Projects' } satisfies Dict,
    description: { zh: '实验室研究项目', en: 'Lab research projects' } satisfies Dict
  },
  publications: {
    title: { zh: '论文发表', en: 'Publications' } satisfies Dict,
    description: { zh: '实验室论文发表列表', en: 'Lab publications' } satisfies Dict
  },
  news: {
    title: { zh: '动态', en: 'News' } satisfies Dict,
    description: { zh: '实验室动态与新闻', en: 'Lab news and updates' } satisfies Dict,
    timeline: { zh: '时间线', en: 'Timeline' } satisfies Dict,
    calendar: { zh: '日历', en: 'Calendar' } satisfies Dict,
    showComments: { zh: '显示评论', en: 'Show Comments' } satisfies Dict,
    hideComments: { zh: '收起评论', en: 'Hide Comments' } satisfies Dict,
    relatedPeople: { zh: '相关成员', en: 'People' } satisfies Dict
  },
  library: {
    title: { zh: '图书馆', en: 'Library' } satisfies Dict,
    description: { zh: '实验室知识库', en: 'Lab knowledge base' } satisfies Dict,
    expand: { zh: '展开', en: 'Expand' } satisfies Dict,
    collapse: { zh: '收起', en: 'Collapse' } satisfies Dict
  },
  about: {
    title: { zh: '关于实验室', en: 'About' } satisfies Dict,
    description: { zh: '关于我们', en: 'About us' } satisfies Dict,
    heading: { zh: '关于实验室', en: 'About the Lab' } satisfies Dict,
    lead: {
      zh: '本页将介绍实验室概况、研究方向与联系方式。',
      en: 'An overview of the lab, our research directions, and how to reach us.'
    } satisfies Dict,
    note: {
      zh: '外部表单与订阅链接会在后续配置。',
      en: 'External forms and subscription links will be configured later.'
    } satisfies Dict
  },
  search: {
    title: { zh: '搜索', en: 'Search' } satisfies Dict,
    description: { zh: '站内搜索', en: 'Search this site' } satisfies Dict
  },
  citation: {
    copied: { zh: 'BibTeX 已复制到剪贴板', en: 'BibTeX copied to clipboard' } satisfies Dict,
    copyFailed: { zh: 'BibTeX 复制失败', en: 'Failed to copy BibTeX' } satisfies Dict
  },
  project: {
    present: { zh: '至今', en: 'Present' } satisfies Dict,
    participants: { zh: '参与人员', en: 'Participants' } satisfies Dict,
    repository: { zh: '代码仓库', en: 'Repository' } satisfies Dict,
    period: { zh: '起止时间', en: 'Period' } satisfies Dict
  }
} as const;

/** Pick the string for `lang` out of a dictionary. */
export function t(dict: Dict, lang: Lang): string {
  return dict[lang];
}
