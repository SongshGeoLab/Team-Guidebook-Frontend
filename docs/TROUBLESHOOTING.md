# 故障排除指南

## 问题：部署成功但页面没有内容显示

### 可能的原因

1. **Content Collections 数据为空**
2. **React 组件未正确渲染**
3. **内容同步问题**
4. **构建时数据获取失败**

### 诊断步骤

#### 1. 检查构建日志

在 Vercel 部署日志中查找：

```
[content] Cloned ... into .content
[content] Content Collections symlinks setup completed
```

如果看到这些消息，说明内容已同步。

#### 2. 检查 Content Collections 数据

在构建日志中查找是否有错误：

- `getCollection` 相关的错误
- Schema 验证错误
- 文件读取错误

#### 3. 检查实际部署的页面

访问部署的页面，打开浏览器开发者工具：

1. **检查控制台错误**：
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 查找 JavaScript 错误

2. **检查网络请求**：
   - 打开 Network 标签
   - 刷新页面
   - 检查是否有资源加载失败

3. **检查页面 HTML**：
   - 右键页面 -> "查看页面源代码"
   - 检查是否有实际内容，还是只有空的 HTML 结构

#### 4. 检查内容仓库数据

确认内容仓库中确实有数据：

- `Team-Guidebook/通讯录/*.md` - People 数据
- `Team-Guidebook/图书馆/项目/*.md` - Projects 数据
- `Team-Guidebook/档案馆/YYYY-MM-DD.md` - News 数据（需要 `publish: true`）
- `Team-Guidebook/图书馆/**/*.md` - Library 数据

#### 5. 检查 publish 字段

确保内容文件的 frontmatter 中有 `publish: true`：

```yaml
---
publish: true
title: ...
---
```

如果 `publish: false` 或未设置，内容不会显示。

### 常见问题

#### 问题 1: News 页面为空

**原因**：News 数据来自 Daily Notes，需要：
- 文件名格式：`YYYY-MM-DD.md`
- Frontmatter 中 `publish: true`
- 不是 `draft: true`

**检查**：
```bash
# 在内容仓库中检查
ls Team-Guidebook/档案馆/
# 查看文件内容，确认有 publish: true
```

#### 问题 2: Projects 页面为空

**原因**：Projects 需要：
- 文件在 `Team-Guidebook/图书馆/项目/` 目录
- Frontmatter 中 `publish: true`
- 必需的字段：`id`, `title`, `start_date`

**检查**：
```bash
# 在内容仓库中检查
ls Team-Guidebook/图书馆/项目/
```

#### 问题 3: People 页面为空

**原因**：People 需要：
- 文件在 `Team-Guidebook/通讯录/` 目录
- Frontmatter 中 `publish: true`
- 必需的字段：`id`, `name`, `role`

#### 问题 4: React 组件未渲染

**症状**：页面 HTML 结构存在，但没有内容

**可能原因**：
- React 组件加载失败
- `client:load` 指令未正确工作
- JavaScript 错误阻止渲染

**检查**：
1. 查看浏览器控制台是否有错误
2. 检查 `dist/_astro/` 目录中是否有 React 相关的 JS 文件
3. 检查网络请求，确认 JS 文件已加载

### 调试方法

#### 方法 1: 添加调试输出

在页面中添加临时调试信息：

```astro
---
// 在 src/pages/zh/index.astro 中
const allNews = await getCollection('news', ({ data }) => data.publish !== false);
console.log('News count:', allNews.length);
console.log('News items:', allNews.map(n => n.id));
---
```

然后查看构建日志或浏览器控制台。

#### 方法 2: 检查测试页面

访问 `/test-collections` 页面（如果存在），查看所有集合的数据：

```
https://your-site.vercel.app/test-collections
```

#### 方法 3: 本地构建测试

在本地使用相同的环境变量进行构建：

```bash
export CONTENT_REPO_URL=https://github.com/SongshGeoLab/Team-Guidebook.git
export GITHUB_TOKEN=your_token
export CONTENT_REPO_REF=main

npm run build
npm run preview
```

然后访问 `http://localhost:4321` 检查内容是否正确显示。

### 快速检查清单

- [ ] 构建日志显示内容已克隆
- [ ] 构建日志显示 Content Collections 已设置
- [ ] 内容仓库中有实际数据文件
- [ ] 数据文件的 frontmatter 中有 `publish: true`
- [ ] 浏览器控制台没有 JavaScript 错误
- [ ] 页面 HTML 源代码中有内容（不只是空结构）
- [ ] React 组件 JS 文件已加载

### 获取帮助

如果以上步骤都无法解决问题，请提供：

1. **构建日志**（Vercel 部署日志）
2. **浏览器控制台错误**（如果有）
3. **页面源代码**（右键 -> 查看页面源代码）
4. **内容仓库结构**（确认数据文件存在）

## 相关文档

- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)
- [配置说明](./CONFIGURATION.md)
- [本地测试指南](./LOCAL_TESTING.md)

