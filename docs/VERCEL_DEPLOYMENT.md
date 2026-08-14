# Vercel 部署指南

本文档说明如何将 Astro 实验室站点部署到 Vercel。

## 前置要求

1. Vercel 账户（可通过 GitHub 登录）
2. 内容仓库的访问权限（如果内容仓库是私有的）

## 部署步骤

### 1. 连接仓库到 Vercel

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库（Team-Guidebook-Frontend）
4. Vercel 会自动检测到这是一个 Astro 项目

### 2. 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

#### 必需的环境变量

- **`CONTENT_REPO_URL`**: 内容仓库的 **HTTPS** URL，例如
  `https://github.com/username/Team-Guidebook.git`。
  不要用 SSH URL：`scripts/setup-content.mjs` 只对 `https://github.com/` 开头的
  地址注入鉴权，SSH 形式在 Vercel 上会**静默失败**。

- **`GITHUB_TOKEN`** (私有内容仓库必需): 对内容仓库有读权限的 token。
  Vercel 的 GitHub App 只能访问项目自身的仓库，因此私有内容仓库必须单独配置
  （见下方第 3 节）。建议使用**仅对内容仓库只读**的 fine-grained token。

- **`CONTENT_REPO_REF`** (可选): 分支或标签名称，默认为 `main`

- **`SITE_URL`** (可选): 覆盖 canonical / sitemap 使用的站点源地址，
  绑定自定义域名后设置。

#### 可选的环境变量（Giscus 评论系统）

- **`PUBLIC_GISCUS_REPO`**: GitHub 仓库（格式：`username/repo`）
- **`PUBLIC_GISCUS_REPO_ID`**: Giscus 仓库 ID
- **`PUBLIC_GISCUS_CATEGORY`**: 讨论分类名称
- **`PUBLIC_GISCUS_CATEGORY_ID`**: 讨论分类 ID
- **`PUBLIC_GISCUS_THEME`** (可选): Giscus 主题，默认 `preferred_color_scheme`

详细配置说明见 [GISCUS_SETUP.md](./GISCUS_SETUP.md)

### 3. 私有内容仓库访问配置

如果内容仓库是私有的，需要配置部署密钥：

#### 方法 1: 使用 GitHub App（推荐，但需要额外配置）

**重要**：Vercel 的 GitHub App 默认只能访问当前项目仓库，无法访问其他私有仓库。需要额外配置：

1. **在内容仓库中授权 Vercel GitHub App**：
   - 进入内容仓库 `SongshGeoLab/Team-Guidebook` 的 Settings
   - 进入 "Integrations" -> "Installed GitHub Apps"
   - 找到 "Vercel" 应用，点击 "Configure"
   - 在 "Repository access" 中，确保选择了 "Only select repositories" 并包含 `Team-Guidebook` 仓库
   - 或者选择 "All repositories"（如果允许）

2. **如果上述方法不可用，使用 Personal Access Token（方法 3）更可靠**

#### 方法 2: 使用 Deploy Key

1. 在内容仓库中生成 SSH 密钥对：
   ```bash
   ssh-keygen -t ed25519 -C "vercel-deploy" -f ~/.ssh/vercel_deploy_key
   ```

2. 将公钥添加到内容仓库的 Deploy Keys：
   - 进入内容仓库的 Settings -> Deploy keys
   - 添加新的 Deploy key，粘贴 `~/.ssh/vercel_deploy_key.pub` 的内容

3. 在 Vercel 项目设置中，添加环境变量：
   - 名称：`SSH_PRIVATE_KEY`
   - 值：`~/.ssh/vercel_deploy_key` 的私钥内容（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）

4. 修改 `CONTENT_REPO_URL` 为 SSH 格式：
   - `git@github.com:username/Team-Guidebook.git`

**注意**：如果使用 Deploy Key，需要修改 `scripts/setup-content.mjs` 以支持 SSH 认证，或者使用 HTTPS 格式配合 Personal Access Token。

#### 方法 3: 使用 Personal Access Token（HTTPS，推荐用于私有仓库）

这是访问私有仓库最可靠的方法：

1. **在 GitHub 创建 Personal Access Token**：
   - 访问 GitHub Settings -> Developer settings -> Personal access tokens -> Tokens (classic)
   - 点击 "Generate new token (classic)"
   - 选择权限：**`repo`**（完整仓库访问权限，包括私有仓库）
   - 设置过期时间（建议选择较长时间，如 90 天或 1 年）
   - 点击 "Generate token"
   - **重要**：立即复制 token（格式：`ghp_xxxxxxxxxxxx`），之后无法再次查看

2. **在 Vercel 项目设置中配置环境变量**：
   - `CONTENT_REPO_URL` = `https://github.com/SongshGeoLab/Team-Guidebook.git`
   - `GITHUB_TOKEN` = `ghp_your_token_here`（你刚创建的 token）
   - `CONTENT_REPO_REF` = `main`（可选）

3. **脚本会自动使用 `GITHUB_TOKEN` 进行认证**：
   - 脚本已支持从 `GITHUB_TOKEN` 环境变量读取 token
   - 会自动将 token 插入到 HTTPS URL 中进行认证

**安全提示**：
- Token 存储在 Vercel 环境变量中，不会暴露在代码中
- 定期轮换 token 以提高安全性
- 如果 token 泄露，立即在 GitHub 中撤销

### 4. 部署

配置完成后，Vercel 会自动触发部署：

1. 安装依赖 (`npm install`)
2. 运行 `prebuild` hook（内容同步）
3. 构建 Astro 站点 (`npm run build`)
4. 生成 Pagefind 搜索索引 (`postbuild` hook)

### 5. 验证部署

部署成功后，检查：

- [ ] 站点可以正常访问
- [ ] 内容正确加载（People、Projects、News、Library、Publications）
- [ ] 附件图片可以正常显示
- [ ] 搜索功能正常工作（需要等待 Pagefind 索引生成）
- [ ] Giscus 评论功能正常（如果已配置）

### 6. 自动部署与预览环境

Vercel 会在以下情况自动触发部署：

- **生产环境**：推送到主分支（main/master）→ 部署到生产环境
- **预览环境**：推送到其他分支（如 `dev`）→ 自动创建预览部署
- **Pull Request**：创建或更新 PR → 自动创建预览部署
- **手动触发**：在 Vercel Dashboard 中手动触发部署

#### 配置预览部署

Vercel 默认会为所有分支创建预览部署。要确保 `dev` 分支触发预览部署：

1. **在 Vercel 项目设置中**：
   - 进入 "Settings" -> "Git"
   - 确认 "Production Branch" 设置为 `main`（或你的主分支）
   - 确认 "Automatic deployments from Git" 已启用

2. **预览部署的 URL**：
   - 格式：`https://your-project-{hash}.vercel.app`
   - 每个分支和 PR 都有唯一的预览 URL
   - 可以在 Vercel Dashboard 的 "Deployments" 页面查看

3. **为预览环境配置不同的内容分支**（可选）：

   如果你想在 `dev` 分支预览时使用 `dev` 分支的内容仓库，可以：

   - 在 Vercel 项目设置中，进入 "Settings" -> "Environment Variables"
   - 为 `CONTENT_REPO_REF` 设置不同的值：
     - **Production**: `main`
     - **Preview**: `dev`（或使用 Vercel 的自动环境变量）
     - **Development**: `dev`

   或者，使用 Vercel 的环境变量功能，根据部署环境自动选择分支。

#### 预览部署的优势

- **安全测试**：在合并到主分支前测试更改
- **团队协作**：分享预览链接给团队成员审查
- **独立环境**：每个分支都有独立的部署环境
- **自动更新**：每次推送都会自动更新预览部署

## 故障排除

### 构建失败：无法克隆内容仓库

**问题**：`CONTENT_REPO_URL` 配置错误或没有访问权限

**解决方案**：
- 检查 `CONTENT_REPO_URL` 是否正确
- 如果仓库是私有的，确保已配置 GitHub App 权限或 Deploy Key
- 检查 Vercel 构建日志中的错误信息

### 构建失败：找不到内容文件

**问题**：内容同步脚本无法找到内容源

**解决方案**：
- 检查 `CONTENT_REPO_URL` 和 `CONTENT_REPO_REF` 是否正确
- 确认内容仓库中存在 `Team-Guidebook/` 目录结构
- 查看构建日志中 `[content]` 开头的消息

### 搜索功能不可用

**问题**：Pagefind 索引未生成

**解决方案**：
- 检查 `postbuild` hook 是否成功运行
- 确认 `dist/pagefind/` 目录存在
- 查看构建日志中 Pagefind 的输出

### 附件图片无法显示

**问题**：附件同步失败

**解决方案**：
- 检查内容仓库中是否存在 `Team-Guidebook/assets/` 或 `Team-Guidebook/图片库/` 目录
- 查看构建日志中附件同步的消息
- 确认 `public/attachments/` 目录在构建后存在

## 环境变量参考

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `CONTENT_REPO_URL` | 是 | 内容仓库 Git URL | `https://github.com/username/Team-Guidebook.git` |
| `CONTENT_REPO_REF` | 否 | 分支或标签 | `main` |
| `PUBLIC_GISCUS_REPO` | 否 | Giscus 仓库 | `username/repo` |
| `PUBLIC_GISCUS_REPO_ID` | 否 | Giscus 仓库 ID | `R_kgDO...` |
| `PUBLIC_GISCUS_CATEGORY` | 否 | 讨论分类名称 | `Announcements` |
| `PUBLIC_GISCUS_CATEGORY_ID` | 否 | 讨论分类 ID | `DIC_kwDO...` |

## 相关文档

- [Giscus 配置指南](./GISCUS_SETUP.md)
- [README.md](../README.md) - 项目概述和本地开发指南

