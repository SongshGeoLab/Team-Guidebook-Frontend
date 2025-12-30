# 我的实验室站点设计文档

我要实现一个自己实验室，这将是我的主页，包括以下栏目和功能：

## 功能概览

1. 有一个漂亮的主页和导航页，吸引人想要探索我们的实验室
2. 后端会有一个 `.bib` 文件，可以展示所有的实验室论文出版记录，并且允许用户按主题筛选
3. 博客功能，可以撰写一系列由 markdown 排版的文章，可以链接到对应的出版记录，对精选文章做细致剖析
4. 导航页面包括：Home, News, Projects, Library, Publications, People, About
5. 接入 GitHub 的登录系统，对特定的文章进行评论
6. 中 / 英双语切换
7. People 页面是实验室成员展示，每个人都有一个自己的页面，是一个存在后端的 markdown 文档，各种信息在 yaml 里
8. 可以设置每个 markdown 文件的访问权限，是否公开在网页展示（publish: true/false）
9. News 对接的是一系列日期格式的文件，按照时间轴和类别、相关人士、标签等展示出来
10. 有一个链接可以填写表单，访问用户的其他学者可以与我们建立联系，或订阅我们的 newsletter，这个链接我可以外部配置
11. Projects 和 Publications，每个实体也都是有一个 markdown 文件，彼此之间可以链接，也都有标签系统方便筛选
12. 有 assets 系统，允许点击链接可以下载一些文件，比如我们某次演讲的 PPT，比如我们的数据集

## 当前达成的关键约定（实现依据）

1. **内容源与目录适配（Direct Map）**：优先直接复用现有 `Team-Guidebook/` 目录结构，不强制整理为新的 `lab/zh/en` 树。
   - News：`Team-Guidebook/档案馆/YYYY-MM-DD.md`（Obsidian 日记），按 bullet 抽取；`#P/姓名` 表示关联人。
   - People：`Team-Guidebook/通讯录/*.md`
   - Projects：`Team-Guidebook/图书馆/项目/*.md`
   - Library：`Team-Guidebook/图书馆/**`
   - Blog（可选）：`Team-Guidebook/公告板/博客/*.md`

2. **双语策略（阶段 1）**：先发布中文内容（`/zh`），英文（`/en`）先做 UI 壳与空态占位，后续再补英文内容与中英配对跳转。

3. **WikiLinks 规则**：`[[...]]` 默认解析到 Library（`/[lang]/library/...`），同名歧义时要求使用路径形式 `[[词条/Git]]` 消歧。

4. **附件策略（A）**：保留内容库现有的 `Team-Guidebook/assets/` 与 `Team-Guidebook/图片库/`，构建时同步到站点 `public/attachments/`，网页统一通过 `/attachments/...` 访问。

5. **评论范围**：默认仅对 News 与论文解读/精选（后续扩展）开放 GitHub 评论（Giscus）。

## 链接导航


## 功能详细介绍

