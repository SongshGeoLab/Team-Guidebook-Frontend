# 内容加载问题排查指南

## 问题：远端部署时内容无法加载

### 可能的原因

1. **克隆后的目录结构问题**
   - GitHub 克隆后，如果仓库名是 `Team-Guidebook`，目录结构是 `.content/Team-Guidebook/`
   - 脚本需要正确识别这个结构

2. **Symlink 路径解析问题**
   - 在 Vercel 构建环境中，symlink 的路径解析可能失败
   - 相对路径 vs 绝对路径问题

3. **文件权限问题**
   - 克隆后的文件可能有权限限制

4. **Content Collections 路径问题**
   - Astro 的 Content Collections 可能无法正确读取 symlink

### 诊断步骤

#### 步骤 1: 在 Vercel 构建日志中查找

查看构建日志中的以下信息：

```
[content] Cloned ... into .content
[content] Content Collections symlinks setup completed
```

如果看到这些消息，说明内容已克隆和设置。

#### 步骤 2: 检查构建日志中的错误

查找以下错误信息：

- `Content root not found` - 内容根目录未找到
- `Failed to create symlink` - Symlink 创建失败
- `Source directory ... not found` - 源目录未找到
- `getCollection` 相关的错误

#### 步骤 3: 添加调试输出

在 Vercel 构建时，可以临时添加调试输出来查看实际路径。

修改 `scripts/setup-content.mjs`，在关键位置添加日志：

```javascript
// 在 cloneSource() 函数后
log(`Cloned to: ${dest}`);
log(`Checking if Team-Guidebook exists: ${exists(path.join(dest, 'Team-Guidebook'))}`);
log(`Checking if 通讯录 exists: ${exists(path.join(dest, '通讯录'))}`);

// 在 setupContentCollections() 函数中
log(`Team-Guidebook path: ${teamGuidebookPath}`);
log(`Source for people: ${path.resolve(teamGuidebookPath, '通讯录')}`);
log(`Target for people: ${path.resolve(contentDir, 'people')}`);
```

#### 步骤 4: 检查克隆后的目录结构

GitHub 克隆时，如果仓库名是 `Team-Guidebook`，克隆后的结构是：

```
.content/
  Team-Guidebook/
    通讯录/
    图书馆/
    档案馆/
```

但脚本需要处理两种情况：
1. `.content/Team-Guidebook/` (克隆的仓库)
2. `.content/` 直接包含 `通讯录/` 等目录 (如果仓库根就是 Team-Guidebook)

### 常见问题修复

#### 问题 1: 克隆后找不到 Team-Guidebook

**症状**：构建日志显示 `Source directory ... not found`

**原因**：克隆后的目录结构与预期不符

**修复**：检查 `getTeamGuidebookPath()` 函数的逻辑，确保能正确处理克隆后的结构。

#### 问题 2: Symlink 创建失败

**症状**：构建日志显示 `Failed to create symlink`

**原因**：Vercel 构建环境可能不支持 symlink，或路径解析错误

**替代方案**：如果 symlink 不可用，可以考虑：
1. 直接复制文件（而不是 symlink）
2. 使用 Astro 的 `base` 配置指向内容目录

#### 问题 3: Content Collections 读取失败

**症状**：`getCollection()` 返回空数组

**可能原因**：
1. Symlink 路径不正确
2. 文件权限问题
3. Schema 验证失败（所有文件都被过滤）

**检查方法**：
1. 访问 `/test-collections` 页面查看数据
2. 检查构建日志中的 schema 验证错误
3. 确认文件的 `publish` 字段

### 调试工具

使用调试脚本检查内容设置：

```bash
npm run debug:content
```

这个脚本会检查：
- `.content` 目录是否存在
- Content Collections symlinks 是否正确
- 实际内容文件是否存在

### 临时解决方案

如果 symlink 在 Vercel 上不工作，可以修改 `setupContentCollections()` 函数，使用复制而不是 symlink：

```javascript
// 替换 symlink 为复制
const copyCollection = (collectionName, sourcePath) => {
  const source = path.resolve(teamGuidebookPath, sourcePath);
  const target = path.resolve(contentDir, collectionName);
  
  // 复制目录而不是创建 symlink
  fs.cpSync(source, target, { recursive: true });
  log(`Copied ${collectionName} collection: ${target} <- ${sourcePath}`);
};
```

**注意**：这会增加构建时间，但更可靠。

### 验证清单

- [ ] 构建日志显示内容已克隆
- [ ] 构建日志显示 symlinks 已创建
- [ ] `/test-collections` 页面显示数据
- [ ] 浏览器控制台没有 Content Collections 相关错误
- [ ] 实际页面有内容显示

### 获取帮助

如果以上步骤都无法解决问题，请提供：

1. **完整的构建日志**（特别是 `[content]` 开头的消息）
2. **`npm run debug:content` 的输出**（如果可以在本地运行）
3. **`/test-collections` 页面的内容**（显示的数据数量）
4. **浏览器控制台错误**（如果有）

## 相关文档

- [故障排除指南](./TROUBLESHOOTING.md)
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)

