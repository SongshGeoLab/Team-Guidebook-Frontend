# Giscus 评论系统配置指南

本项目使用 [Giscus](https://giscus.app) 作为评论系统，基于 GitHub Discussions。

## 功能说明

- 评论功能默认仅对 **News（动态）** 页面开放
- 每个新闻项下方有一个 "Show Comments" 按钮，点击后展开评论区域
- 评论数据存储在 GitHub Discussions 中，无需额外数据库

## 配置步骤

### 1. 在 GitHub 仓库中启用 Discussions

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **General** → **Features**
3. 勾选 **Discussions** 选项
4. 保存设置

### 2. 安装 Giscus App

1. 访问 [Giscus App 安装页面](https://github.com/apps/giscus)
2. 点击 **Install** 按钮
3. 选择要安装的仓库（可以是单个仓库或所有仓库）
4. 确认安装

### 3. 获取配置信息

1. 访问 [Giscus 配置页面](https://giscus.app)
2. 填写以下信息：
   - **Repository**: 选择你的仓库（格式：`owner/repo`）
   - **Discussion Category**: 选择一个分类（例如 "Announcements"）
   - **Page ↔️ Discussions Mapping**: 选择 "Pathname" 或 "URL"
   - **Discussion Term**: 选择 "Pathname"
   - **Theme**: 选择主题（推荐 "Preferred color scheme"）
   - **Language**: 选择语言（中文选择 "zh-CN"，英文选择 "en"）
3. 滚动到底部，复制配置信息中的以下值：
   - `data-repo`: 仓库名称（例如：`songshgeo/Team-Guidebook-Frontend`）
   - `data-repo-id`: 仓库 ID（数字字符串）
   - `data-category`: 分类名称（例如：`Announcements`）
   - `data-category-id`: 分类 ID（数字字符串）

### 4. 配置环境变量

在项目根目录创建 `.env` 文件（如果不存在），添加以下环境变量：

```env
# Giscus Configuration
PUBLIC_GISCUS_REPO=owner/repo
PUBLIC_GISCUS_REPO_ID=your-repo-id
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=your-category-id
PUBLIC_GISCUS_THEME=preferred_color_scheme
```

**注意**：
- 所有环境变量必须以 `PUBLIC_` 开头，这样 Astro 才能在客户端访问
- `PUBLIC_GISCUS_THEME` 是可选的，默认为 `preferred_color_scheme`
- 不要将 `.env` 文件提交到 Git（应该已经在 `.gitignore` 中）

### 5. 验证配置

1. 运行 `npm run dev` 启动开发服务器
2. 访问 `/zh/news` 或 `/en/news` 页面
3. 在任意新闻项下方点击 "Show Comments" 按钮
4. 如果配置正确，应该能看到 Giscus 评论框

## 故障排除

### 评论不显示

1. **检查环境变量**：确保所有必需的环境变量都已设置
2. **检查 Giscus App 安装**：确保 Giscus App 已安装到你的仓库
3. **检查 Discussions 是否启用**：确保仓库的 Discussions 功能已启用
4. **检查浏览器控制台**：打开开发者工具，查看是否有错误信息

### 评论显示但无法登录

1. **检查 Giscus App 权限**：确保 Giscus App 有访问 Discussions 的权限
2. **检查分类设置**：确保选择的分类在 GitHub Discussions 中已创建

### 不同页面显示相同评论

这是正常的。Giscus 使用 `identifier` 来区分不同的讨论线程。每个新闻项使用 `news-{item.id}` 作为唯一标识符。

## 高级配置

如果需要自定义 Giscus 的行为，可以修改以下文件：

- `src/components/react/ui/GiscusComments.tsx`: Giscus 组件实现
- `src/components/react/ui/NewsTimeline.tsx`: 评论集成位置
- `src/config/giscus.ts`: 配置读取逻辑

## 参考链接

- [Giscus 官方文档](https://github.com/giscus/giscus)
- [Giscus 配置页面](https://giscus.app)
- [GitHub Discussions 文档](https://docs.github.com/en/discussions)

