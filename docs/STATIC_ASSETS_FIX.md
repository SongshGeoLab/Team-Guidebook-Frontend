# 静态资源问题修复

## 问题：背景图片和水波纹特效未显示

### 原因

`.gitignore` 文件中 `public/` 目录被忽略，导致以下文件未提交到 Git：
- `public/background.jpg` - 背景图片
- `public/favicon.svg` - 网站图标
- 其他静态资源

在 Vercel 构建时，这些文件不存在，导致：
- 背景图片无法加载
- 水波纹特效无法显示（因为依赖背景图片）
- React Three Fiber 组件可能报错

### 解决方案

#### 步骤 1: 更新 .gitignore

`.gitignore` 已更新，现在只忽略 `public/attachments/`（从内容仓库同步的附件），而不是整个 `public/` 目录。

#### 步骤 2: 提交静态资源文件

需要将以下文件添加到 Git：

```bash
git add public/background.jpg
git add public/favicon.svg
git add .gitignore
git commit -m "fix: Add static assets to repository"
git push
```

#### 步骤 3: 验证文件存在

确保以下文件存在于 `public/` 目录：

- `public/background.jpg` - 背景图片（必需）
- `public/favicon.svg` - 网站图标（可选但推荐）

#### 步骤 4: 重新部署

推送后，Vercel 会自动触发重新部署。部署完成后，背景图片和水波纹特效应该正常显示。

### 验证

部署后，检查：

1. **浏览器开发者工具**：
   - 打开 Network 标签
   - 刷新页面
   - 检查 `/background.jpg` 是否成功加载（状态码 200）

2. **页面显示**：
   - 背景图片应该显示
   - 鼠标移动时应该有水波纹特效
   - 页面应该有渐变遮罩效果

3. **控制台错误**：
   - 打开 Console 标签
   - 不应该有图片加载错误
   - 不应该有 React Three Fiber 相关错误

### 如果问题仍然存在

#### 检查 1: React 组件加载

如果背景图片加载成功但水波纹特效仍然不显示：

1. 检查浏览器控制台是否有 JavaScript 错误
2. 检查 `dist/_astro/` 目录中是否有 React 相关的 JS 文件
3. 确认 `@react-three/fiber` 和 `@react-three/drei` 已正确安装

#### 检查 2: 图片路径

确认 `RippleBackground` 组件使用的路径正确：

```tsx
// src/components/react/RippleBackground.tsx
export default function RippleBackground({ imageUrl = '/background.jpg' }: { imageUrl?: string })
```

路径 `/background.jpg` 是正确的，因为 Astro 会将 `public/` 目录中的文件映射到根路径。

#### 检查 3: CORS 或加载策略

如果图片加载失败，检查：
- Vercel 的部署配置
- 是否有 CORS 限制
- 图片文件大小是否过大

### 相关文件

- `public/background.jpg` - 背景图片
- `src/components/react/RippleBackground.tsx` - 水波纹特效组件
- `src/layouts/BaseLayout.astro` - 使用 RippleBackground 的布局

### 注意事项

- `public/attachments/` 目录仍然被忽略（这些文件从内容仓库同步）
- 只有静态资源（如背景图片、图标）需要提交到 Git
- 如果更换背景图片，只需替换 `public/background.jpg` 文件并提交

