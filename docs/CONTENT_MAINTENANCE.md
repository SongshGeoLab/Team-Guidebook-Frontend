# 内容仓库维护指南

本文档面向内容维护者，说明如何在 `Team-Guidebook` 内容仓库中维护文档，以便正确显示在实验室站点上。

## 目录结构

内容仓库采用 **Direct Map** 策略，直接使用现有的 Obsidian 目录结构，无需重新组织。站点会自动映射以下目录：

```
Team-Guidebook/
├── 通讯录/              # People 集合
│   └── *.md            # 成员信息文件
├── 图书馆/
│   ├── 项目/           # Projects 集合
│   │   └── *.md       # 项目文件
│   ├── 文献/           # Publications 集合（BibTeX 文件）
│   │   └── *.bib      # 论文 BibTeX 文件
│   └── **/*.md         # Library 集合（知识库文档）
│       ├── 专栏/       # 专栏文章
│       └── 词条/       # 词条文档
├── 档案馆/              # News 集合
│   └── YYYY-MM-DD.md  # 日记文件（Daily Notes）
├── assets/             # 附件目录（图片、PDF 等）
└── 图片库/              # 图片附件目录
```

## 内容类型维护指南

### 1. People（成员信息）

**位置**：`通讯录/*.md`

**必需字段**：
- `id`: 唯一标识符（通常与文件名相同，kebab-case）
- `name`: 显示名称
- `role`: 角色（如 "教授"、"博士后"、"博士生"、"硕士生"、"校友"）

**可选字段**：
- `avatar`: 头像路径（如 `/attachments/avatar.jpg`）
- `email`: 邮箱地址
- `aliases`: 别名数组（用于在 News 中通过 `#P/<Name>` 标签关联）
- `links`: 外部链接数组（如个人主页、GitHub）
- `interests`: 研究兴趣数组
- `publish`: 是否发布（默认 `true`）
- `date`: 创建或更新日期
- `tags`: 标签数组

**示例**：

```yaml
---
id: alice-wang
name: 王爱丽丝
role: 博士生
avatar: /attachments/alice.jpg
email: alice@example.com
aliases:
  - 爱丽丝
  - Alice
links:
  - label: 个人主页
    url: https://alice.example.com
  - label: GitHub
    url: https://github.com/alice
interests:
  - 机器学习
  - 地理信息系统
publish: true
tags:
  - 机器学习
  - GIS
---

# 王爱丽丝

我是实验室的博士生，专注于机器学习在地理信息系统中的应用。
```

**注意事项**：
- `aliases` 字段用于在 News 日记中通过 `#P/<Name>` 标签自动关联成员
- 文件名建议使用 kebab-case（如 `alice-wang.md`），与 `id` 保持一致
- 设置 `publish: false` 可以隐藏成员信息（但文件仍会被处理）

### 2. Projects（项目信息）

**位置**：`图书馆/项目/*.md`

**必需字段**：
- `id`: 唯一标识符
- `title`: 项目标题
- `start_date`: 开始日期（格式：`YYYY-MM-DD`）

**可选字段**：
- `end_date`: 结束日期（格式：`YYYY-MM-DD`，留空表示"进行中"）
- `people`: 参与人员 ID 数组（必须匹配 People 集合中的 `id`）
- `repo`: GitHub 仓库 URL
- `bib_key`: 关联的 BibTeX key（如果有相关论文）
- `publish`: 是否发布（默认 `true`）
- `date`: 创建或更新日期
- `tags`: 标签数组

**示例**：

```yaml
---
id: ml-gis-project
title: 机器学习在地理信息系统中的应用
start_date: 2024-01-01
end_date: 2024-12-31
people:
  - alice-wang
  - bob-li
repo: https://github.com/lab/ml-gis
bib_key: mlgis2024
tags:
  - 机器学习
  - GIS
  - 深度学习
publish: true
---

# 机器学习在地理信息系统中的应用

这是一个研究项目，旨在探索机器学习技术在地理信息系统中的应用。

## 项目目标

- 目标 1
- 目标 2

## 进展

项目目前进展顺利...
```

**注意事项**：
- `people` 字段中的 ID 必须与 `通讯录/` 中的成员 `id` 匹配
- 日期格式必须为 `YYYY-MM-DD`
- 如果项目仍在进行中，可以不设置 `end_date` 或设置为空

### 3. News（动态/新闻）

**位置**：`档案馆/YYYY-MM-DD.md`（Obsidian Daily Notes）

**发布控制**：
- 必须在 frontmatter 中设置 `publish: true` 才会被提取
- 如果设置了 `draft: true`，即使 `publish: true` 也不会被提取
- 如果 `publish` 字段缺失或为 `false`，文件会被忽略

**内容格式**：
- 每个 bullet 点（`-` 开头的列表项）会被提取为一个独立的 news 条目
- 支持 Markdown 格式（粗体、链接、代码等）
- 使用 `#P/<Name>` 标签关联成员（会自动解析为 `related_people`）

**必需字段**（frontmatter）：
- `publish: true`（显式设置，否则不会发布）

**可选字段**（frontmatter）：
- `draft: false`（如果为 `true`，即使 `publish: true` 也不会发布）
- `date`: 日期（通常从文件名提取，格式：`YYYY-MM-DD`）
- `tags`: 标签数组

**示例**：

```yaml
---
publish: true
draft: false
date: 2024-12-30
tags:
  - 会议
  - 论文发表
---

# 2024-12-30

- 今天参加了 **ICML 2024** 会议，做了关于机器学习的报告 #P/王爱丽丝
- 我们的论文被 **Nature** 接收了！ #P/王爱丽丝 #P/李波
- 实验室新成员 #P/张小明 加入了我们的项目
```

**注意事项**：
- 日期通常从文件名提取（`YYYY-MM-DD.md`），但也可以在 frontmatter 中指定
- `#P/<Name>` 标签会通过 People 集合的 `aliases` 字段解析为成员 ID
- 如果 `#P/<Name>` 无法匹配到任何成员，会被忽略（不会报错）
- 每个 bullet 点会成为一个独立的 news 条目，显示在时间轴上

### 4. Library（知识库文档）

**位置**：`图书馆/**/*.md`（不包括 `项目/` 和 `文献/` 子目录）

**特点**：
- 保留 Obsidian 目录树结构作为侧边栏导航
- 支持任意深度的嵌套目录
- Schema 非常宽松，允许额外的 frontmatter 字段

**可选字段**：
- `title`: 页面标题（默认使用文件名）
- `lang`: 语言（`zh` 或 `en`，通常从路径推断）
- `publish`: 是否发布（默认 `true`）
- `date`: 创建或更新日期
- `tags`: 标签数组

**示例**：

```yaml
---
title: Git 版本控制指南
lang: zh
tags:
  - Git
  - 版本控制
  - 工具
publish: true
---

# Git 版本控制指南

这是一篇关于 Git 使用的知识库文档。

## 基本命令

- `git clone`: 克隆仓库
- `git add`: 添加文件到暂存区

## 相关链接

- [[GitHub]] - GitHub 使用指南
- [[Mesa-Geo]] - Mesa-Geo 项目文档
```

**注意事项**：
- Library 文档支持 WikiLinks（`[[链接]]`），默认解析到 `/[lang]/library/...`
- 建议使用路径形式的 WikiLinks 避免歧义：`[[词条/Git]]` 而不是 `[[Git]]`
- 目录结构会保留，URL 路径会根据目录结构自动生成
- 支持 Obsidian 的所有 Markdown 语法（Callouts、图片嵌入等）

### 5. Publications（论文发表）

**位置**：`图书馆/文献/*.bib` 或 `图书馆/*.bib`

**格式**：BibTeX 文件（`.bib`）

**必需字段**（BibTeX entry）：
- `title`: 论文标题
- `author`: 作者列表（用 `and` 分隔）
- `year`: 发表年份

**可选字段**（BibTeX entry）：
- `journal` 或 `booktitle`: 发表期刊或会议
- `doi`: DOI 号（会自动添加 `https://doi.org/` 前缀）
- `file` 或 `pdf`: PDF 文件路径
- `keywords`: 关键词（用逗号或分号分隔，会解析为 `tags`）

**示例**：

```bibtex
@article{mlgis2024,
  title = {Machine Learning Applications in Geographic Information Systems},
  author = {Wang, Alice and Li, Bob},
  journal = {Nature},
  year = {2024},
  doi = {10.1038/s41586-024-xxxxx},
  file = {:/attachments/mlgis2024.pdf:PDF},
  keywords = {machine learning, GIS, deep learning}
}
```

**注意事项**：
- BibTeX 文件可以包含多个条目，每个条目都会成为一个独立的 publication
- `keywords` 字段会被解析为 `tags`，用于筛选
- PDF 路径如果使用 Obsidian 格式（`:/attachments/...`），需要确保文件在 `assets/` 或 `图片库/` 目录中
- 系统会优先查找 `图书馆/文献/` 目录，如果不存在则查找 `图书馆/` 根目录

## Frontmatter 字段说明

### 通用字段

所有内容类型都支持以下字段：

- **`publish`** (boolean, 默认 `true`): 控制是否在网站上显示
  - `publish: false` 的内容不会出现在列表中，也不会生成页面路由
  - 如果字段缺失，默认为 `true`

- **`date`** (string/date, 可选): 创建或更新日期
  - 格式：`YYYY-MM-DD` 或 ISO 8601 格式
  - 会自动转换为 Date 对象

- **`tags`** (array, 默认 `[]`): 标签数组
  - 用于分类和筛选
  - 示例：`tags: [机器学习, GIS, 深度学习]`

## Obsidian 语法支持

站点完全支持 Obsidian 的 Markdown 语法，包括：

### 1. WikiLinks（内部链接）

**语法**：`[[链接文本]]` 或 `[[链接文本|显示文本]]`

**解析规则**：
- 默认解析到 Library：`[[Git]]` → `/[lang]/library/git`
- 建议使用路径形式避免歧义：`[[词条/Git]]` → `/[lang]/library/词条/git`
- 支持显式语言前缀：`[[en/Page]]` → `/en/library/page`
- 生成的链接会自动添加 `internal-link` CSS 类

**示例**：

```markdown
- 查看 [[Git]] 使用指南
- 参考 [[专栏/Python4Science/Week1_导论]] 了解更多
- 英文版本：[[en/Git]]
```

### 2. Callouts（提示框）

**语法**：`> [!TYPE] Title` 后跟内容

**支持的类型**：
- `note` - 普通提示
- `info` - 信息提示
- `tip` - 技巧提示
- `success` - 成功提示
- `warning` - 警告提示
- `danger` 或 `failure` - 危险/失败提示
- `question` - 问题提示
- `bug` - Bug 提示
- `example` - 示例提示
- `quote` - 引用提示

**示例**：

```markdown
> [!INFO] 重要提示
> 这是一个信息提示框，用于突出显示重要信息。

> [!WARNING] 注意事项
> 使用此功能时请注意以下事项：
> 1. 第一点
> 2. 第二点

> [!TIP] 技巧
> 这是一个小技巧，可以帮助你更高效地工作。
```

### 3. 图片嵌入

**语法**：`![[image.png]]` 或 `![[path/to/image.png]]`

**解析规则**：
- 自动转换为标准 Markdown 图片：`![](/attachments/image.png)`
- 支持嵌套路径：`![[subfolder/image.png]]` → `![](/attachments/subfolder/image.png)`
- 图片必须位于 `assets/` 或 `图片库/` 目录中

**示例**：

```markdown
![描述](![[logo.png]])

或者直接使用：

![[screenshot.png]]
```

**注意事项**：
- 图片文件必须存在于 `assets/` 或 `图片库/` 目录中
- 构建时会自动同步到网站的 `public/attachments/` 目录
- 如果文件名冲突，构建会发出警告

### 4. 标准 Markdown

所有标准 Markdown 语法都支持：
- 标题（`#` 到 `######`）
- 粗体（`**text**`）、斜体（`*text*`）
- 代码（`` `code` `` 和 ` ``` ` 代码块）
- 列表（有序和无序）
- 链接（`[text](url)`）
- 表格
- 等等

## 附件管理

### 附件目录

附件文件应放在以下目录之一：

- `Team-Guidebook/assets/` - 通用附件目录
- `Team-Guidebook/图片库/` - 图片专用目录

### 附件同步

- 构建时会自动将附件同步到网站的 `public/attachments/` 目录
- 在 Markdown 中引用附件时，使用 `/attachments/文件名` 路径
- 支持嵌套目录结构

### 附件引用方式

**方式 1：Obsidian 嵌入语法**（推荐）

```markdown
![[image.png]]
![[subfolder/document.pdf]]
```

**方式 2：标准 Markdown 图片**

```markdown
![](/attachments/image.png)
![描述](/attachments/image.png)
```

**方式 3：标准 Markdown 链接**

```markdown
[下载文档](/attachments/document.pdf)
```

### 文件名冲突

如果多个附件目录中存在同名文件，构建会发出警告。建议：
- 使用有意义的文件名避免冲突
- 使用子目录组织附件
- 如果必须使用相同文件名，考虑重命名其中一个

## 发布控制

### publish 字段

所有内容类型都支持 `publish` 字段来控制是否在网站上显示：

- `publish: true`（默认）：内容会出现在网站上
- `publish: false`：内容不会出现在列表中，也不会生成页面路由

**示例**：

```yaml
---
publish: false  # 这个成员信息不会显示在网站上
name: 测试用户
role: 测试角色
---
```

### News 的特殊规则

News 集合有特殊的发布控制规则：

1. **必须显式设置 `publish: true`** 才会被提取
2. 如果设置了 `draft: true`，即使 `publish: true` 也不会被提取
3. 如果 `publish` 字段缺失或为 `false`，文件会被完全忽略

**示例**：

```yaml
---
publish: true   # 必须显式设置
draft: false    # 确保不是草稿
date: 2024-12-30
---

# 2024-12-30

- 这条动态会被发布
```

## 人员关联（News）

在 News 日记中，可以使用 `#P/<Name>` 标签关联成员：

**语法**：`#P/<Name>`

**解析规则**：
- 系统会通过 People 集合的 `aliases` 字段匹配成员
- 匹配成功后，会自动添加到 `related_people` 字段
- 如果无法匹配，标签会被忽略（不会报错）

**示例**：

```markdown
- 今天 #P/王爱丽丝 做了关于机器学习的报告
- 我们的论文被接收了！ #P/王爱丽丝 #P/李波
```

**注意事项**：
- 确保成员的 `aliases` 字段包含所有可能的名称变体
- 标签名称必须与 `aliases` 中的某个值完全匹配（区分大小写）
- 可以在一个 bullet 点中使用多个 `#P/` 标签关联多个成员

## 常见问题

### Q: 如何隐藏某个内容？

A: 在 frontmatter 中设置 `publish: false`。

### Q: News 日记没有被提取？

A: 检查以下几点：
1. 文件名格式是否为 `YYYY-MM-DD.md`
2. frontmatter 中是否设置了 `publish: true`
3. 是否设置了 `draft: true`（如果设置了，即使 `publish: true` 也不会发布）
4. 文件中是否有 bullet 点（`-` 开头的列表项）

### Q: WikiLinks 链接不正确？

A: 
1. 确保目标文件存在于 Library 集合中
2. 使用路径形式的 WikiLinks 避免歧义：`[[词条/Git]]` 而不是 `[[Git]]`
3. 检查文件名和路径是否正确

### Q: 图片无法显示？

A: 
1. 确保图片文件在 `assets/` 或 `图片库/` 目录中
2. 检查文件名和路径是否正确
3. 查看构建日志中是否有附件同步错误

### Q: `#P/<Name>` 标签无法关联成员？

A: 
1. 确保成员的 `aliases` 字段包含该名称
2. 检查标签格式是否正确（`#P/` 前缀，名称区分大小写）
3. 确保成员文件的 `publish: true`

### Q: Projects 中的 `people` 字段无法关联？

A: 
1. 确保 `people` 数组中的 ID 与 `通讯录/` 中的成员 `id` 完全匹配
2. 检查成员文件是否存在且 `publish: true`
3. ID 区分大小写，必须完全一致

### Q: Publications 没有被解析？

A: 
1. 确保 BibTeX 文件在 `图书馆/文献/` 或 `图书馆/` 根目录中
2. 检查 BibTeX 格式是否正确
3. 确保每个条目都有 `title`、`author`、`year` 字段
4. 查看构建日志中是否有解析错误

## 最佳实践

1. **使用有意义的文件名**：文件名应该清晰描述内容，使用 kebab-case
2. **保持 frontmatter 简洁**：只包含必要的字段
3. **使用路径形式的 WikiLinks**：避免歧义，提高可维护性
4. **合理组织附件**：使用子目录组织附件，避免文件名冲突
5. **及时更新 `aliases`**：确保 News 中的人员关联正常工作
6. **使用标签分类**：合理使用 `tags` 字段进行分类
7. **定期检查 `publish` 状态**：确保只有需要发布的内容设置了 `publish: true`

## 相关文档

- [配置指南](./CONFIGURATION.md) - 环境变量和内容同步配置
- [本地测试指南](./LOCAL_TESTING.md) - 本地开发和测试说明
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md) - 生产环境部署配置
- [Giscus 配置指南](./GISCUS_SETUP.md) - 评论系统配置

