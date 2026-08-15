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

type Dict = Record<Lang, string>;

export const ui = {
  /**
   * Header navigation labels.
   *
   * Only the labels live here. The hrefs stay in Header.astro, next to the
   * routes they have to match — a label is a translation, a route is a fact
   * about what got built, and mixing them is how a nav item outlives its page.
   */
  nav: {
    home: { zh: '首页', en: 'Home' } satisfies Dict,
    research: { zh: '研究', en: 'Research' } satisfies Dict,
    news: { zh: '动态', en: 'News' } satisfies Dict,
    projects: { zh: '项目', en: 'Projects' } satisfies Dict,
    resources: { zh: '资源', en: 'Resources' } satisfies Dict,
    library: { zh: '图书馆', en: 'Library' } satisfies Dict,
    publications: { zh: '出版物', en: 'Publications' } satisfies Dict,
    people: { zh: '团队', en: 'People' } satisfies Dict,
    about: { zh: '关于', en: 'About' } satisfies Dict
  },
  /** Strings belonging to the page shell rather than to any one page. */
  shell: {
    mainNav: { zh: '主导航', en: 'Main navigation' } satisfies Dict,
    search: { zh: '搜索', en: 'Search' } satisfies Dict,
    skipToContent: { zh: '跳到主要内容', en: 'Skip to main content' } satisfies Dict,
    rightsReserved: { zh: '保留所有权利。', en: 'All rights reserved.' } satisfies Dict
  },
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
  research: {
    title: { zh: '研究方向', en: 'Research' } satisfies Dict,
    description: {
      zh: '我们长期关注的研究主题',
      en: 'The questions the group works on'
    } satisfies Dict,
    empty: {
      zh: '尚未添加研究方向。',
      en: 'No research themes have been added yet.'
    } satisfies Dict,
    people: { zh: '相关成员', en: 'People' } satisfies Dict,
    publications: { zh: '代表论文', en: 'Selected Publications' } satisfies Dict,
    projects: { zh: '相关项目', en: 'Related Projects' } satisfies Dict
  },
  resources: {
    title: { zh: '数据与工具', en: 'Resources' } satisfies Dict,
    description: {
      zh: '实验室对外发布的数据集、代码与模型',
      en: 'Datasets, code and models the group publishes'
    } satisfies Dict,
    empty: {
      zh: '尚未发布资源。',
      en: 'No resources have been published yet.'
    } satisfies Dict,
    license: { zh: '许可协议', en: 'Licence' } satisfies Dict,
    released: { zh: '发布时间', en: 'Released' } satisfies Dict
  },
  /** Labels for the `type` enum on the resources collection. */
  resourceTypes: {
    dataset: { zh: '数据集', en: 'Dataset' } satisfies Dict,
    code: { zh: '代码', en: 'Code' } satisfies Dict,
    model: { zh: '模型', en: 'Model' } satisfies Dict,
    tool: { zh: '工具', en: 'Tool' } satisfies Dict,
    course: { zh: '课程', en: 'Course' } satisfies Dict
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
    participants: { zh: '参与人员', en: 'Team Members' } satisfies Dict,
    repository: { zh: '代码仓库', en: 'Repository' } satisfies Dict,
    duration: { zh: '项目时间', en: 'Duration' } satisfies Dict,
    tags: { zh: '标签', en: 'Tags' } satisfies Dict
  },
  person: {
    email: { zh: '邮箱：', en: 'Email: ' } satisfies Dict,
    links: { zh: '链接：', en: 'Links: ' } satisfies Dict,
    interests: { zh: '研究兴趣：', en: 'Research Interests: ' } satisfies Dict,
    destination: { zh: '现任：', en: 'Now at: ' } satisfies Dict
  },
  i18n: {
    /**
     * Shown when a page falls back to the base language.
     *
     * Saying so is the point. `/zh` and `/en` used to serve byte-identical
     * Chinese bodies with nothing to indicate it, so an English-speaking reader
     * had no way to tell a missing translation from a page that simply had no
     * more to say.
     */
    fallbackNotice: {
      zh: '本页尚无其他语言版本，以下为中文原文。',
      en: 'This page has not been translated yet; the original Chinese text follows.'
    } satisfies Dict
  }
} as const;
