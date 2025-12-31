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

- **`CONTENT_REPO_URL`**: 内容仓库的 Git URL
  - 公开仓库：`https://github.com/username/Team-Guidebook.git`
  - 私有仓库：`https://github.com/username/Team-Guidebook.git`（需要配置部署密钥，见下方）

- **`CONTENT_REPO_REF`** (可选): 分支或标签名称，默认为 `main`

#### 可选的环境变量（Giscus 评论系统）

- **`PUBLIC_GISCUS_REPO`**: GitHub 仓库（格式：`username/repo`）
- **`PUBLIC_GISCUS_REPO_ID`**: Giscus 仓库 ID
- **`PUBLIC_GISCUS_CATEGORY`**: 讨论分类名称
- **`PUBLIC_GISCUS_CATEGORY_ID`**: 讨论分类 ID

详细配置说明见 [GISCUS_SETUP.md](./GISCUS_SETUP.md)

### 3. 私有内容仓库访问配置

如果内容仓库是私有的，需要配置部署密钥：

#### 方法 1: 使用 GitHub App（推荐）

1. 在 Vercel 项目设置中，进入 "Settings" -> "Git"
2. 确保 "Install GitHub App" 已安装并授权访问私有仓库
3. Vercel 会自动使用 GitHub App 的权限访问私有仓库

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

#### 方法 3: 使用 Personal Access Token（HTTPS）

1. 在 GitHub 创建 Personal Access Token（Settings -> Developer settings -> Personal access tokens）
   - 权限：`repo`（访问私有仓库）

2. 在 Vercel 项目设置中，修改 `CONTENT_REPO_URL`：
   - `https://<token>@github.com/username/Team-Guidebook.git`
   - 或者使用环境变量：`CONTENT_REPO_URL=https://github.com/username/Team-Guidebook.git` 和 `GITHUB_TOKEN=<token>`

3. 如果使用环境变量方式，需要修改 `scripts/setup-content.mjs` 以支持从环境变量读取 token。

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

### 6. 自动部署

Vercel 会在以下情况自动触发部署：

- 推送到主分支（main/master）
- 创建 Pull Request
- 手动触发（在 Vercel Dashboard 中）

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

