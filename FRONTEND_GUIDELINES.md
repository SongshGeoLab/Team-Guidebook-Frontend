# 前端开发对接文档 (Frontend Guidelines)

这份文档旨在明确 **后端 (内容/数据结构)** 与 **前端 (UI/交互)** 的协作边界与对接标准。

我们的核心架构是：**Obsidian (内容源) -> Astro Content Collections (数据层) -> Astro Components (UI层)**。

## 1. 协作模式

*   **后端职责 (我)**:
    *   维护 `src/content.config.ts` (Schema 定义) 与各类 **Content Loaders**（把 Obsidian 内容映射为 collections）。
    *   采用 **Direct Map**：内容不强制整理为 `lab/zh/en`，而是直接读取 `.content/Team-Guidebook/` 的既有目录结构。
    *   负责 Markdown 的解析配置 (remark/rehype 插件)，确保 WikiLinks (`[[Link]]`) 和 Callouts 能正确转换为 HTML。
    *   提供清洗好的、类型安全的数据集合 (Collections)。
*   **前端职责 (你)**:
    *   专注于 `src/pages/` (路由逻辑) 和 `src/components/` (UI组件)。
    *   从 `astro:content` 导入数据，不需要关心 Markdown 具体是如何被解析的。
    *   实现多语言 (`zh`/`en`) 布局和交互。

## 1.1 内容源映射 (Direct Map)

内容仓库会在 dev/CI 被放到 `.content/`（软链或 clone）。后端会按如下规则映射到 collections：

- `news`: `.content/Team-Guidebook/档案馆/YYYY-MM-DD.md`（Obsidian 日记，按 bullet 抽取；仅 `publish: true` 才公开）
- `people`: `.content/Team-Guidebook/通讯录/*.md`
- `projects`: `.content/Team-Guidebook/图书馆/项目/*.md`
- `library`: `.content/Team-Guidebook/图书馆/**/*.md`
- `blog`：**尚未实现**（`src/content.config.ts` 只定义了 people / projects / news / library / publications）。阶段 2 才做独立栏目：`.content/Team-Guidebook/公告板/博客/*.md`

## 2. 数据接口 (Content Collections API)

你将通过 Astro 的 `getCollection` API 获取数据。所有数据都已经过 Zod Schema 验证，具有完整的 TypeScript 类型提示。

### 2.1 核心集合 (Collections)

请在 `src/pages/` 中使用以下集合：

| 集合名称 (Collection) | 用途 | 对应路由示例 | 关键字段 (Props) |
| :--- | :--- | :--- | :--- |
| `people` | 实验室成员 | `/[lang]/people/[slug]` | `name`, `role`, `avatar`, `email`, `interests` |
| `projects` | 项目展示 | `/[lang]/projects/[slug]` | `title`, `people` (关联人员ID), `start_date`, `repo` |
| `news` | 动态/新闻 | `/[lang]/news` (列表) | `date`, `tags`, `related_people`, `body` (HTML) |
| `publications` | 论文发表 | `/[lang]/publications` | (特殊) 由 BibTeX 解析的 JSON 对象列表 |
| `library` | 知识库/Wiki | `/[lang]/library/[...slug]` | 标准 Markdown 内容 |

### 2.2 数据类型定义 (Type Definitions)

你在组件中可以获得以下类型的数据结构 (后端保证提供)：

**Person (成员)**
```typescript
interface Person {
  id: string;          // 唯一标识, e.g., "alice-wang"
  name: string;        // 显示名称
  role: string;        // e.g., "PhD Student"
  avatar: string;      // 头像路径, e.g., "/attachments/alice.jpg"
  email?: string;
  links?: Array<{ label: string; url: string }>;
  body: RenderedContent; // 个人简介 (Markdown 渲染后的组件)
}
```

**Project (项目)**
```typescript
interface Project {
  id: string;
  title: string;
  start_date: Date;
  end_date?: Date; // 如果为空则代表 "Present"
  people: string[]; // 关联的 Person ID 列表
  tags: string[];
  repo?: string;   // GitHub URL
  body: RenderedContent; // 项目详情
}
```

**NewsItem (动态)**
```typescript
interface NewsItem {
  date: Date;
  content: string; // HTML string (extracted from Daily Notes bullet items)
  tags: string[];
  related_people: string[]; // related Person IDs
}
```

## 3. 页面与组件需求 (UI/UX Requirements)

请优先实现以下核心页面。设计风格参考：简洁、学术、易读 (Tailwind CSS)。

### 3.1 布局 (Layouts)
*   **`BaseLayout.astro`**:
    *   包含 `<head>` SEO 信息 (支持传入 `title`, `description`)。
    *   **Header**: 响应式导航栏，包含 Logo 和 语言切换器 (Zh/En)。
    *   **Footer**: 版权信息、友情链接。

### 3.2 首页 (Home) - `src/pages/[lang]/index.astro`
*   **Hero Section**: 实验室一句话介绍 + 大图背景/轮播。
*   **Recent News**: 显示最近 3-5 条动态 (使用 `NewsTimeline` 组件)。
*   **Highlight Projects**: 精选项目卡片网格。

### 3.3 列表与详情页
*   **People 列表页**: 按角色分组 (Professor, Postdoc, PhD, Master, Alumni)。
    *   *组件*: `PersonCard` (头像 + 姓名 + 角色 + 邮箱)。
*   **Publications 列表页**:
    *   **必须功能**: 按年份分组，支持按 "Tag/Topic" 筛选。
    *   *组件*: `CitationItem` (标准学术引用格式，支持 BibTeX 导出/复制按钮)。
*   **Project 详情页**:
    *   右侧/顶部显示项目元数据 (起止时间、GitHub 链接、参与人员)。
    *   参与人员请链接回 People 详情页。

## 4. 特殊功能说明

### 4.1 图片与资源
*   所有静态资源 (图片、PDF) 位于 `public/attachments/`（策略 A：从 Obsidian vault 的 `Team-Guidebook/assets/` 与 `Team-Guidebook/图片库/` 同步而来）。
*   在 Markdown 中引用图片通常是 `![[image.png]]` (Obsidian 格式) 或 `![](/attachments/image.png)`。
*   **后端承诺**: 会配置 remark 插件将 `![[image.png]]` 自动转换为指向 `/attachments/image.png` 的标准 HTML `<img>` 标签。前端只需处理标准的图片样式。

### 4.2 内部链接 (WikiLinks)
*   内容中会出现 `[[...]]` 格式的链接（Obsidian WikiLinks）。
*   **后端承诺**: 默认解析到 Library：`<a href="/[lang]/library/..." class="internal-link">`。
*   **前端任务**: 为 `.internal-link` 类添加样式 (例如虚线下划线或特定颜色)，以区分普通外部链接。

## 4.3 i18n 范围（现状）

**实现现状**（与早期计划不同，此处描述的是代码实际行为）：

- `/` 重定向到 `/en/`，默认语言只在 `astro.config.mjs` 一处定义。
- `/zh` 与 `/en` 两棵路由树**渲染同一份中文内容**——没有任何按语言过滤的逻辑，
  尽管 `src/content.config.ts` 的 library schema 已声明了 `lang` 字段。
  差异仅限于 URL 前缀、`<html lang>` 与少量 UI 字符串。
- `BaseLayout` 已输出 `canonical` 与 `hreflang`，因此重复内容对 SEO 无害；
  但这不等于 `/en` 是真正的英文站。

**待决策**：是按 `data.lang` 过滤（`/en` 只渲染英文条目、其余走空态），
还是暂时下线 `/en`。在此之前，任何"英文内容"的假设都不成立。

## 5. 开发建议

1.  **Mock Data**: 仓库已提供 fixtures，无需 vault 权限即可开发：`CONTENT_DIR=fixtures/Team-Guidebook npm run dev`。新增用例请加到 `fixtures/Team-Guidebook/` 下（CI 用的就是这一份）。
2.  **样式框架**: 使用 Tailwind CSS v4。
3.  **图标库**: 推荐使用 `lucide-react` 或 `lucide-astro`。

---
**附注**: 遇到数据字段缺失或类型不匹配问题，请直接联系后端修改 Schema，**不要**在前端硬编码兼容逻辑。

