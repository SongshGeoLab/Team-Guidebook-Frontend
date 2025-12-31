# 本地测试指南

本文档说明如何在本地测试构建流程，特别是使用私有内容仓库的情况。

## 快速开始

### 方法 1: 使用本地 Team-Guidebook 目录（最简单）

如果你本地已经有 `Team-Guidebook` 目录，直接运行：

```bash
npm run build
```

脚本会自动使用 `./Team-Guidebook` 作为内容源，无需任何配置。

### 方法 2: 使用 SSH 访问私有仓库（推荐）

如果你已经配置了 SSH key 访问 GitHub，可以使用 SSH URL：

```bash
# 设置环境变量
export CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
export CONTENT_REPO_REF=main  # 可选，默认为 main

# 运行构建
npm run build
```

或者创建 `.env` 文件（需要手动创建，`.env` 已被 gitignore）：

```bash
# .env
CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
CONTENT_REPO_REF=main
```

然后运行：

```bash
npm run build
```

### 方法 3: 使用 Personal Access Token（HTTPS）

如果你没有配置 SSH key，可以使用 GitHub Personal Access Token：

1. **创建 Personal Access Token**：
   - 访问 GitHub Settings -> Developer settings -> Personal access tokens -> Tokens (classic)
   - 点击 "Generate new token (classic)"
   - 选择权限：`repo`（访问私有仓库）
   - 复制生成的 token（格式：`ghp_xxxxxxxxxxxx`）

2. **配置环境变量**：

```bash
export CONTENT_REPO_URL=https://github.com/SongshGeoLab/Team-Guidebook.git
export GITHUB_TOKEN=ghp_your_token_here
export CONTENT_REPO_REF=main  # 可选
```

或者创建 `.env` 文件：

```bash
# .env
CONTENT_REPO_URL=https://github.com/SongshGeoLab/Team-Guidebook.git
GITHUB_TOKEN=ghp_your_token_here
CONTENT_REPO_REF=main
```

3. **运行构建**：

```bash
npm run build
```

## 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `CONTENT_REPO_URL` | 否* | 内容仓库 URL | `git@github.com:SongshGeoLab/Team-Guidebook.git` 或 `https://github.com/SongshGeoLab/Team-Guidebook.git` |
| `CONTENT_REPO_REF` | 否 | 分支或标签，默认为 `main` | `main`, `develop`, `v1.0.0` |
| `GITHUB_TOKEN` | 条件** | GitHub Personal Access Token（仅 HTTPS URL 需要） | `ghp_xxxxxxxxxxxx` |
| `CONTENT_DIR` | 否 | 本地内容目录路径（覆盖默认的 `./Team-Guidebook`） | `../Team-Guidebook` |

\* 如果不设置 `CONTENT_REPO_URL`，脚本会使用本地的 `./Team-Guidebook` 目录（如果存在）

\** 仅当使用 HTTPS URL 访问私有仓库时需要

## 完整测试流程

### 1. 测试内容同步

```bash
# 只运行内容同步脚本（不构建）
npm run setup:content
```

检查输出：
- `[content] Linked ...` 或 `[content] Cloned ...` - 内容源已准备
- `[content] Syncing attachments ...` - 附件同步成功
- `[content] Content Collections symlinks setup completed` - 集合链接已创建

### 2. 测试开发服务器

```bash
# 启动开发服务器（会自动运行内容同步）
npm run dev
```

访问 `http://localhost:4321` 查看站点。

### 3. 测试生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

访问 `http://localhost:4321` 预览生产构建。

### 4. 验证构建结果

检查以下内容：

- [ ] `dist/` 目录已生成
- [ ] `dist/pagefind/` 目录存在（搜索索引）
- [ ] `dist/attachments/` 目录存在（附件）
- [ ] 中英文页面都已生成（`dist/zh/`, `dist/en/`）
- [ ] 所有内容页面都能正常访问

## 故障排除

### 问题：SSH 认证失败

**错误信息**：
```
Permission denied (publickey)
```

**解决方案**：
1. 确认 SSH key 已添加到 GitHub：`ssh -T git@github.com`
2. 如果失败，参考 [GitHub SSH 设置指南](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
3. 或者使用 Personal Access Token（方法 3）

### 问题：HTTPS 克隆失败（私有仓库）

**错误信息**：
```
remote: Repository not found
fatal: repository 'https://github.com/...' not found
```

**解决方案**：
1. 确认已设置 `GITHUB_TOKEN` 环境变量
2. 确认 token 有 `repo` 权限
3. 确认仓库 URL 正确
4. 或者使用 SSH URL（方法 2）

### 问题：克隆失败，回退到本地目录

**现象**：
```
[content] Failed to clone ...
[content] Clone failed, attempting to use local fallback...
[content] Using fallback content source: ...
```

**说明**：这是正常行为。如果克隆失败，脚本会自动使用本地的 `./Team-Guidebook` 目录（如果存在）。

**解决方案**：
- 如果希望使用远程仓库，检查网络连接和认证配置
- 如果本地目录可用，这是正常的 fallback 行为

### 问题：找不到内容文件

**错误信息**：
```
No content source found. Provide CONTENT_DIR or CONTENT_REPO_URL, or place Team-Guidebook in project root.
```

**解决方案**：
1. 确保设置了 `CONTENT_REPO_URL` 环境变量
2. 或者确保项目根目录存在 `Team-Guidebook` 目录
3. 或者设置 `CONTENT_DIR` 指向本地内容目录

## 当前配置示例

基于你的仓库 `https://github.com/SongshGeoLab/Team-Guidebook.git`，推荐配置：

### 使用 SSH（推荐）

```bash
# .env 或 export
CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
CONTENT_REPO_REF=main
```

### 使用 HTTPS + Token

```bash
# .env 或 export
CONTENT_REPO_URL=https://github.com/SongshGeoLab/Team-Guidebook.git
GITHUB_TOKEN=ghp_your_token_here
CONTENT_REPO_REF=main
```

## 相关文档

- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md) - 生产环境部署配置
- [README.md](../README.md) - 项目概述

