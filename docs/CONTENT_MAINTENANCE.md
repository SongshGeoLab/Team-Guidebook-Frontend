# 内容仓库维护指南

本文档面向内容维护者，说明如何在 `Team-Guidebook` 内容仓库（Obsidian vault）中组织内容，
以便正确显示在实验室站点上。

**这份文档是站点与内容之间的契约。** 站点的 Zod schema 定义在
`src/content.config.ts`，本文档描述的就是它——两者不一致时以代码为准，并请提 issue。

## 开工前先做两件事

**1. 拿现成的骨架，别从空目录开始。** `fixtures/Team-Guidebook/` 是一份可运行的最小样板，
每个集合都有一条真实条目（含一对中英文兄弟文件、一个校友、一份精选论文 sidecar）。
直接复制它，再把内容换掉：

```bash
cp -R fixtures/Team-Guidebook /path/to/your/Team-Guidebook
```

**2. 每次提交内容前跑一次校验。**

```bash
CONTENT_DIR=/path/to/your/Team-Guidebook npm run check:content
```

这一步不是可选的礼节。**`npm run build` 只会拦住写错字段类型的错误，拦不住写错引用的错误**
——研究方向里把 `featured_publications` 的 key 打错一个字母，构建照样成功，
那篇代表论文只是从页面上消失了，没有任何提示。`check:content` 专门查这一类：

- 人员 / 项目 / 研究方向 / BibTeX key 的交叉引用是否都指得到东西
- `role` 是否在受控词表内（否则该成员会掉进「其他成员」）
- 精选论文 sidecar 的 `bib_key` 是否对得上 `.bib`
- `.en.md` 是否有对应的基准文件
- id 是否重复

报错信息给的是 **vault 内的相对路径**（`通讯录/xxx.md`），而构建报错给的是
`src/content/people/xxx.md` —— 那是个软链，你在内容仓库里根本找不到。

## 目录结构

内容仓库采用 **Direct Map** 策略，直接使用既有的 Obsidian 目录结构：

```
Team-Guidebook/
├── site.md                  # 站点身份（名称、口号、社交链接）+ 「关于」页正文
├── 通讯录/                   # People 集合
│   ├── *.md                 #   成员信息
│   └── *.en.md              #   成员英文简介（可选，见「双语」）
├── 档案馆/                   # News 集合
│   └── YYYY-MM-DD.md        #   Obsidian 日记，按 bullet 抽取
├── 图书馆/                   # Library 集合（知识库，除下列子目录外）
│   ├── 项目/*.md             # Projects 集合
│   ├── 研究/*.md             # Research 集合（研究方向）
│   ├── 资源/*.md             # Resources 集合（数据与工具）
│   ├── 文献/
│   │   ├── *.bib            # Publications 集合（Zotero 导出）
│   │   └── 精选/<bib_key>.md #   精选论文的补充信息（sidecar）
│   ├── 专栏/                 # 知识库文章
│   └── 词条/                 # 知识库词条
├── assets/                  # 附件（图片、PDF）
└── 图片库/                   # 图片附件
```

> `项目/`、`研究/`、`资源/`、`文献/` 虽然位于 `图书馆/` 之下，但**不属于** Library 集合——
> 它们各有自己的集合与页面。这条规则定义在 `src/utils/contentLayout.js` 的
> `OWNED_BY_OTHER_COLLECTIONS`，只有那一处。

---

## 双语

站点有 `/zh` 与 `/en` 两套路由。**中文是基准语言，英文是可选的覆盖层**；缺英文时页面
回退到中文，并在正文上方显示一条提示——不会出现空白页。

机制有两种，按字段长短选择：

### 1. 短字段：同一文件内成对

在同一个 `.md` 的 frontmatter 里用 `字段` / `字段_en` 成对存放：

```yaml
name: 宋爽
name_en: Shuang Song
title: 研究组长
title_en: Group Leader
```

> **为什么不整份文件复制两遍**：`email`、`orcid`、`role` 这些与语言无关的字段会被迫
> 维护两份，然后不可避免地漂移。

支持配对的字段在下文各集合中标注为 `x` / `x_en`。

### 2. 长正文：兄弟文件

在基准文件旁边放一个 `<同名>.en.md`，只写正文：

```
通讯录/song-shuang.md      ← 中文，完整 frontmatter + 中文正文
通讯录/song-shuang.en.md   ← 英文，只需下面两行 frontmatter + 英文正文
```

```yaml
---
lang: en
translation_of: song-shuang # 可选，仅供作者自己对照
---
```

`.en.md` 文件**只承载正文**。不要在里面重复 `role`、`email` 等字段——它们不会被读取。

适用于：`通讯录/`、`图书馆/项目/`、`图书馆/研究/`、`图书馆/资源/`、`图书馆/` 知识库。

### 3. News 的双语

日记 bullet 用嵌套子项，避免条目顺序漂移：

```markdown
- 我们的论文被 **Nature** 接收 #P/宋爽
```

> News 目前只渲染中文原文，英文路由显示同一条。这是已知限制，不是 bug。

---

## 各集合字段说明

所有集合都支持 `publish`（布尔，默认 `true`）与 `tags`（数组，默认 `[]`）。
`publish: false` 的条目既不出现在列表里，也不会生成页面。

### site.md（站点配置，单例）

放在 vault 根目录。**正文会渲染为「关于」页面。**

| 字段                                     | 必需    | 说明                                          |
| :--------------------------------------- | :------ | :-------------------------------------------- |
| `name` / `name_en`                       | ✅ name | 实验室名称，显示在页头、页脚与首页            |
| `tagline` / `tagline_en`                 |         | 一句话简介                                    |
| `headline` / `headline_en`               |         | 首页大标题第一行                              |
| `headline_accent` / `headline_accent_en` |         | 首页大标题第二行（渐变强调色）                |
| `affiliation` / `affiliation_en`         |         | 所属机构                                      |
| `email`、`address` / `address_en`        |         | 联系方式，显示在「关于」页                    |
| `logo`                                   |         | `/attachments/` 下的路径                      |
| `socials`                                |         | `[{label, url, icon}]`，显示在页脚            |
| `footer_note` / `footer_note_en`         |         | 页脚附注                                      |
| `nav`                                    |         | `[{href, label, label_en}]`，**覆盖**默认导航 |

> `nav` 请谨慎使用。导航项指向的是路由，而路由由代码决定——在这里写一个不存在的页面，
> 站点会正常构建，读者会拿到 404。不填则使用代码里那份能被验证的默认导航。

### 通讯录/*.md（People）

| 字段                                     | 必需    | 说明                                       |
| :--------------------------------------- | :------ | :----------------------------------------- |
| `id`                                     | ✅      | 唯一标识，kebab-case，建议与文件名一致     |
| `name` / `name_en`                       | ✅ name | 显示名称                                   |
| `role`                                   | ✅      | **受控词表**，见下                         |
| `title` / `title_en`                     |         | 自由文本职称，如「副教授」。显示在卡片上   |
| `order`                                  |         | 组内排序；不填则排在填了的后面，再按姓名排 |
| `status`                                 |         | `current`（默认）或 `alumni`               |
| `destination` / `destination_en`         |         | 校友去向，如「示例大学助理教授」           |
| `joined` / `left`                        |         | `YYYY-MM-DD`                               |
| `avatar`                                 |         | 头像路径，如 `/attachments/alice.jpg`      |
| `email`                                  |         | 邮箱                                       |
| `aliases`                                |         | 别名数组，用于 News 中 `#P/<名字>` 的解析  |
| `interests` / `interests_en`             |         | 研究兴趣数组                               |
| `links`                                  |         | `[{label, url}]` 自由外链                  |
| `orcid`、`scholar`、`github`、`homepage` |         | 学术档案，会渲染成带图标的链接             |

**`role` 受控词表**（定义在 `src/utils/roles.ts`）：

`pi` · `postdoc` · `phd` · `master` · `undergrad` · `staff` · `visitor`

常见中英文写法会自动归一化——`教授`、`Professor`、`Principal Investigator` 都归入 `pi`，
`博士生`、`PhD Student`、`Ph.D. student` 都归入 `phd`，大小写与首尾空格不敏感。
**词表之外的写法不会报错**，但会落到「其他成员 / Others」分组里——如果你看到某人出现在
那里，说明该写法还没被收录，请提 issue 或直接写受控值。

> 从前 `role` 是自由文本，分组靠与十个硬编码写法逐字比对，写成 `Ph.D. student`
> 或多打一个空格就会自成一组、静默排到最后。

校友单独成组，横跨所有 role——一位毕业的博士生显示在「毕业与离任成员」下，而不是
仍然出现在「博士生」里。

### 图书馆/项目/*.md（Projects）

| 字段                     | 必需     | 说明                         |
| :----------------------- | :------- | :--------------------------- |
| `id`                     | ✅       | 唯一标识                     |
| `title` / `title_en`     | ✅ title | 项目标题                     |
| `summary` / `summary_en` |          | 卡片文案，一到两行           |
| `start_date`             | ✅       | `YYYY-MM-DD`                 |
| `end_date`               |          | 留空表示「进行中 / Present」 |
| `people`                 |          | 成员 `id` 数组               |
| `research`               |          | 所属研究方向 `id` 数组       |
| `repo`                   |          | 代码仓库 URL                 |
| `bib_key`                |          | 关联论文的 BibTeX key        |
| `cover`                  |          | 封面图路径                   |
| `featured`               |          | `true` 才会出现在首页精选    |
| `order`                  |          | 精选项目之间的排序           |

> 首页「精选项目」从前是「集合里的前三条」，也就是文件系统碰巧返回的顺序，内容维护者
> 无法影响。现在必须显式 `featured: true`。

### 图书馆/研究/*.md（Research，研究方向）

研究方向是**常青**的——没有起止日期，比任何单个项目都长久。这正是它与「项目」的区别：
项目回答「我们现在拿谁的钱在做什么」，方向回答「我们研究什么」。

| 字段                     | 必需     | 说明                                         |
| :----------------------- | :------- | :------------------------------------------- |
| `id`                     | ✅       | 唯一标识                                     |
| `title` / `title_en`     | ✅ title | 方向名称                                     |
| `summary` / `summary_en` |          | 卡片一句话                                   |
| `order`                  |          | 显示顺序（默认 0）。方向数量少，建议手工排定 |
| `cover`                  |          | 配图                                         |
| `people`                 |          | 负责成员 `id` 数组                           |
| `featured_publications`  |          | **BibTeX key** 数组，代表论文                |
| `projects`               |          | 项目 `id` 数组                               |

> 上面三个引用字段在构建时解析。**引用不到的 id 会被静默丢弃**（不渲染死链，也不报错），
> 所以务必用 `npm run check:content` 检查——它就是为这类错误写的。

### 图书馆/资源/*.md（Resources，数据与工具）

| 字段                         | 必需     | 说明                                                 |
| :--------------------------- | :------- | :--------------------------------------------------- |
| `id`                         | ✅       | 唯一标识                                             |
| `title` / `title_en`         | ✅ title | 名称                                                 |
| `type`                       | ✅       | `dataset` \| `code` \| `model` \| `tool` \| `course` |
| `url`                        | ✅       | 获取地址                                             |
| `summary` / `summary_en`     |          | 一句话说明                                           |
| `doi`                        |          | 资源本身的 DOI                                       |
| `repo`、`license`、`version` |          | 仓库、许可协议（建议 SPDX）、版本号                  |
| `released`                   |          | `YYYY-MM-DD`，列表按此倒序                           |
| `people`                     |          | 维护者 `id` 数组                                     |
| `bib_key`                    |          | 使用时应引用的论文                                   |

### 图书馆/文献/*.bib（Publications）

**`.bib` 文件由 Zotero 导出，请勿手工添加自定义字段。** Zotero 每次重新导出都会整体
覆写并丢弃它不认识的字段——写进去的封面图和亮点，会一直存活到下一次导出为止。

必需：`title`、`author`、`year`。可选：`journal` / `booktitle`、`doi`、`keywords`。

- `keywords` 会解析为 `tags` 用于筛选；`English`、`中文` 这类语言名会被自动剔除。
- `file` / `pdf` 只接受 `http(s)://` 或以 `/` 开头的站内路径。Zotero 默认写入的本地
  绝对路径（`/Users/…/Zotero/storage/…`）会被忽略，并在构建日志中给出警告。
- 论文类型由 BibTeX 条目类型推断：`@article`→期刊，`@inproceedings`→会议，
  `@misc`→预印本，`@incollection`→章节，`@book`→专著，`@phdthesis`→学位论文。

### 图书馆/文献/精选/<bib_key>.md（精选论文 sidecar）

站点需要而 BibTeX 放不下的一切，都写在这里，按 **citation key** 关联。
文件名即 key（也可用 `bib_key` 字段显式指定）。

```yaml
---
bib_key: zeng2023 # 可省略，默认取文件名
featured: true # 默认 true
order: 1
cover: /attachments/zeng2023.png
highlight: 首次量化了…
highlight_en: The first quantification of…
author_ids: [song-shuang] # 本组作者，链接回成员页
code: https://github.com/...
data: https://doi.org/...
press:
  - outlet: 科技日报
    outlet_en: Science Daily
    url: https://...
    date: 2024-02-01
---
```

> 如果 `bib_key` 在任何 `.bib` 里都找不到，构建会**报警告并指出文件名**。
> 从前这类错误是静默的，作者只会看到自己的亮点始终不出现。

### 档案馆/YYYY-MM-DD.md（News）

**必须显式 `publish: true` 才会发布**；`draft: true` 会覆盖它。

每个顶层 bullet（`-` 或 `*` 开头）成为一条独立动态。用 `#P/<名字>` 关联成员，
其余 `#标签` 解析为 tags。

```yaml
---
publish: true
draft: false
---
# 2024-12-30

- 今天参加了 **ICML 2024** 会议 #P/王爱丽丝 #会议
- 我们的论文被 **Nature** 接收了！ #P/王爱丽丝 #P/李波
```

- 日期从文件名提取（必须是 `YYYY-MM-DD.md`），也可在 frontmatter 中指定。
- `#P/<名字>` 通过成员的 `id`、文件名、`name` 或 `aliases` 解析。
  **解析不到会在构建日志中告警**并指出是哪个文件——请留意，这类拼写错误从前是完全静默的。

### 图书馆/**/*.md（Library 知识库）

保留 Obsidian 目录树作为侧边栏导航，schema 宽松，允许额外字段。

| 字段                       | 说明                                                                    |
| :------------------------- | :---------------------------------------------------------------------- |
| `title` / `title_en`       | 页面标题（默认取文件名）                                                |
| `description` 或 `excerpt` | 索引页卡片摘要                                                          |
| `date`、`tags`             | 日期与标签                                                              |
| `lang`                     | 本篇语言（默认 `zh`）。英文正文通常用 `.en.md` 兄弟文件，不需要手写这个 |

---

## Obsidian 语法支持

### WikiLinks

`[[链接]]` 或 `[[链接|显示文本]]`，默认解析到 Library：`[[Git]]` → `/zh/library/词条/Git`。

- **URL 保留大小写与原路径**（`词条/Git` 不会变成 `词条/git`）。
- 建议使用路径形式避免歧义：`[[词条/Git]]` 优于 `[[Git]]`。
- 支持显式语言前缀：`[[en/Page]]`。
- **解析不到的链接会渲染为带删除样式的 `internal-link-broken`，而不是一个看起来
  正常却 404 的链接**，同时在构建日志中告警。

### Callouts

`> [!TYPE] 标题`，支持 `note` `info` `tip` `success` `warning` `danger` `failure`
`question` `bug` `example` `quote` `abstract`。

### 图片嵌入

`![[image.png]]` → `/attachments/image.png`，自动带上 `loading="lazy"`。
图片须位于 `assets/` 或 `图片库/`，构建时同步到 `public/attachments/`。同名文件会告警。

---

## 常见问题

**Q：成员出现在「其他成员」分组里？**
`role` 的写法不在受控词表的别名表内。改用受控值（`pi`/`phd`/…），或提 issue 补充别名。

**Q：英文页面显示的是中文？**
说明缺少 `.en.md` 兄弟文件（长正文）或 `_en` 字段（短字段）。页面上那条提示条就是在说这件事。

**Q：精选论文的亮点没显示？**
检查构建日志。sidecar 的 `bib_key` 对不上任何 `.bib` 条目时会有告警并指出文件名。

**Q：研究方向里的代表论文/项目没显示？**
`featured_publications` 用的是 **BibTeX key**，`projects` / `people` 用的是 **id**。
引用不到的会被静默丢弃——跑 `npm run check:content`，它会指出是哪个文件、哪个字段。

**Q：News 日记没被提取？**
依次检查：文件名是否 `YYYY-MM-DD.md`、是否 `publish: true`、是否 `draft: true`、
文件里是否有 `-` 开头的 bullet。

**Q：改了内容但 dev server 没更新？**
News 与 Publications 用的是自定义 loader。**已知限制**：loader 会重新读取，但 Astro 不会
重新渲染路由，需要重启 dev server。

---

## 相关文档

- [配置指南](./CONFIGURATION.md)
- [本地测试指南](./LOCAL_TESTING.md)
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)
- [Giscus 配置指南](./GISCUS_SETUP.md)
