# 配置说明

## 私有仓库配置（SongshGeoLab/Team-Guidebook）

### 本地开发：SSH 可用，但仅限本地

如果本地已配置 SSH key，可以用 SSH URL。

> ⚠️ **不要把 SSH URL 配到 Vercel 上**。`scripts/setup-content.mjs` 只对
> `https://github.com/` 开头的 URL 注入鉴权头，SSH 形式在 CI 中会**静默失败**。
> 部署环境请一律使用 HTTPS + `GITHUB_TOKEN`。


**创建 `.env` 文件**（在项目根目录）：

```bash
CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
CONTENT_REPO_REF=main
```

**注意**：`.env` 文件已被 `.gitignore` 忽略，不会提交到仓库。

### 在 Vercel 上配置

对于 Vercel 部署，推荐使用 **GitHub App** 方式（最简单）：

1. 在 Vercel 项目设置中，进入 "Settings" -> "Git"
2. 确保 "Install GitHub App" 已安装
3. 授权访问私有仓库 `SongshGeoLab/Team-Guidebook`
4. 设置环境变量：
   - `CONTENT_REPO_URL=https://github.com/SongshGeoLab/Team-Guidebook.git`
   - `CONTENT_REPO_REF=main`（可选）

**更正**：Vercel 的 GitHub App 默认**只能访问当前项目仓库**，无法访问其他私有仓库。
私有内容仓库需要单独配置 `GITHUB_TOKEN`，详见 `docs/VERCEL_DEPLOYMENT.md`。

## 本地测试步骤

### 1. 配置环境变量

创建 `.env` 文件：

```bash
# 项目根目录
cat > .env << EOF
CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
CONTENT_REPO_REF=main
EOF
```

或者直接导出环境变量：

```bash
export CONTENT_REPO_URL=git@github.com:SongshGeoLab/Team-Guidebook.git
export CONTENT_REPO_REF=main
```

### 2. 测试内容同步

```bash
npm run setup:content
```

### 3. 测试开发服务器

```bash
npm run dev
```

### 4. 测试生产构建

```bash
npm run build
npm run preview
```

## 环境变量优先级

脚本按以下优先级查找内容源：

1. **`CONTENT_DIR`** - 本地目录路径（如果设置）
2. **`CONTENT_REPO_URL`** - 远程仓库 URL（如果设置，会尝试克隆）
3. **`./Team-Guidebook`** - 本地 fallback 目录（如果存在）

如果克隆失败，脚本会自动回退到使用本地的 `./Team-Guidebook` 目录。

## 相关文档

- [本地测试指南](./LOCAL_TESTING.md) - 详细的本地测试说明
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md) - 生产环境部署配置

