# Vercel 私有仓库访问问题修复

## 问题现象

部署到 Vercel 时出现错误：
```
fatal: could not read Username for 'https://github.com': No such device or address
[content] Failed to clone https://github.com/SongshGeoLab/Team-Guidebook.git
```

## 原因

Vercel 的 GitHub App 默认只能访问当前项目仓库，无法自动访问其他私有仓库（如内容仓库）。

## 解决方案：使用 Personal Access Token

### 步骤 1: 创建 GitHub Personal Access Token

1. 访问 GitHub: https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 填写信息：
   - **Note**: `Vercel Content Repo Access`
   - **Expiration**: 选择合适的时间（建议 90 天或 1 年）
   - **权限**: 勾选 `repo`（完整仓库访问权限）
4. 点击 "Generate token"
5. **立即复制 token**（格式：`ghp_xxxxxxxxxxxx`），之后无法再次查看

### 步骤 2: 在 Vercel 配置环境变量

1. 进入 Vercel 项目设置
2. 进入 "Settings" -> "Environment Variables"
3. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CONTENT_REPO_URL` | `https://github.com/SongshGeoLab/Team-Guidebook.git` | 内容仓库 URL（HTTPS） |
| `GITHUB_TOKEN` | `ghp_your_token_here` | 你刚创建的 Personal Access Token |
| `CONTENT_REPO_REF` | `main` | 分支名称（可选） |

4. 确保环境变量应用到所有环境（Production, Preview, Development）

### 步骤 3: 重新部署

1. 在 Vercel Dashboard 中，点击 "Deployments"
2. 找到最新的部署，点击 "..." -> "Redeploy"
3. 或者推送新的 commit 触发自动部署

### 步骤 4: 验证

部署成功后，检查构建日志：
- 应该看到 `[content] Cloning content via: git clone ...`
- 应该看到 `[content] Cloned ... into .content`
- 不应该再出现认证错误

## 安全注意事项

1. **Token 安全**：
   - Token 存储在 Vercel 环境变量中，不会暴露在代码或构建日志中
   - 不要在代码中硬编码 token
   - 定期轮换 token（建议每 90 天）

2. **Token 权限**：
   - 只授予必要的权限（`repo`）
   - 如果不再需要，立即在 GitHub 中撤销

3. **Token 泄露处理**：
   - 如果怀疑 token 泄露，立即在 GitHub Settings -> Developer settings -> Personal access tokens 中撤销
   - 创建新 token 并更新 Vercel 环境变量

## 替代方案

如果不想使用 Personal Access Token，可以考虑：

1. **将内容仓库改为公开**（如果内容不敏感）
2. **使用 GitHub App 并正确配置仓库访问权限**（需要内容仓库所有者操作）

## 相关文档

- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)
- [配置说明](./CONFIGURATION.md)

