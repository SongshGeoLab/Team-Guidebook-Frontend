# Release Please 配置指南

本文档说明如何使用 Release Please 自动管理项目版本和发布。

## 概述

Release Please 是 Google 开发的一个工具，可以根据 [Conventional Commits](https://www.conventionalcommits.org/) 规范自动：
- 生成 CHANGELOG.md
- 更新 package.json 版本号
- 创建 Release PR
- 创建 Git 标签和 GitHub Release

## 配置说明

### 1. 配置文件

项目根目录下的 `.release-please-config.json` 定义了 Release Please 的行为：

```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "deeply-disk",
      "version-file": "package.json",
      "changelog-path": "CHANGELOG.md"
    }
  }
}
```

### 2. GitHub Actions 工作流

`.github/workflows/release-please.yml` 定义了自动化流程：

- **触发条件**: 推送到 `main` 或 `master` 分支
- **权限**: 需要 `contents: write` 和 `pull-requests: write` 权限
- **操作**: 运行 Release Please，分析提交并创建/更新 Release PR

## 使用方法

### Conventional Commits 规范

使用规范的提交信息格式，Release Please 会根据提交类型自动决定版本号：

#### 版本号规则

- **Major (主版本号)**: `1.0.0` → `2.0.0`
  - 提交信息包含 `BREAKING CHANGE:` 或使用 `feat!:` 前缀
  - 示例: `feat!: refactor content loading API` 或 `feat: new API\n\nBREAKING CHANGE: old API removed`

- **Minor (次版本号)**: `1.0.0` → `1.1.0`
  - 使用 `feat:` 前缀的新功能
  - 示例: `feat: add search functionality`

- **Patch (补丁版本号)**: `1.0.0` → `1.0.1`
  - 使用 `fix:` 前缀的 bug 修复
  - 示例: `fix: resolve image loading issue`

- **无版本更新**: 以下类型不会触发版本更新
  - `docs:` - 文档更新
  - `style:` - 代码格式调整
  - `refactor:` - 代码重构
  - `test:` - 测试相关
  - `chore:` - 构建/工具相关

### 工作流程

1. **开发功能**:
   ```bash
   git checkout -b feature/new-search
   # ... 编写代码 ...
   git commit -m "feat: add advanced search filters"
   git push origin feature/new-search
   ```

2. **创建 Pull Request**:
   - 在 GitHub 上创建 PR，合并到 `main` 分支
   - PR 标题和提交信息都会影响版本号

3. **自动创建 Release PR**:
   - 当 PR 合并到 `main` 后，Release Please 工作流会自动运行
   - 分析所有新的提交，更新 `CHANGELOG.md` 和 `package.json`
   - 创建一个新的 Release PR（例如：`chore: release v1.0.1`）

4. **审查并合并 Release PR**:
   - 检查 Release PR 中的 CHANGELOG 和版本号是否正确
   - 合并 Release PR 后，会自动：
     - 创建 Git 标签（例如：`v1.0.1`）
     - 创建 GitHub Release，包含完整的 CHANGELOG

### 示例场景

#### 场景 1: 添加新功能

```bash
git commit -m "feat: add dark mode support"
```

结果：
- 版本: `0.0.1` → `0.1.0` (minor bump)
- CHANGELOG: 在 "Added" 部分添加 "add dark mode support"

#### 场景 2: 修复 Bug

```bash
git commit -m "fix: resolve image loading issue in Safari"
```

结果：
- 版本: `0.1.0` → `0.1.1` (patch bump)
- CHANGELOG: 在 "Fixed" 部分添加修复说明

#### 场景 3: 重大变更

```bash
git commit -m "feat!: refactor content loading API

BREAKING CHANGE: ContentLoader API has been completely rewritten.
Old API methods are no longer supported."
```

结果：
- 版本: `0.1.1` → `1.0.0` (major bump)
- CHANGELOG: 在 "Breaking Changes" 部分添加说明

#### 场景 4: 多个提交

如果在一个 Release PR 中包含多个提交：

```bash
git commit -m "feat: add user authentication"
git commit -m "feat: add user profile page"
git commit -m "fix: resolve login redirect issue"
```

结果：
- 版本: `0.1.1` → `0.2.0` (minor bump，因为有新功能)
- CHANGELOG: 包含所有相关的变更

## 手动操作

### 手动触发 Release Please

如果需要手动触发 Release Please 工作流：

1. **通过 GitHub CLI**:
   ```bash
   gh workflow run release-please.yml
   ```

2. **通过 GitHub Web UI**:
   - 进入 Actions 标签页
   - 选择 "Release Please" 工作流
   - 点击 "Run workflow"

### 跳过自动发布

如果某个提交不应该触发版本更新，可以在提交信息中添加 `[skip release]`:

```bash
git commit -m "docs: update README [skip release]"
```

### 手动创建 Release

如果需要手动创建 release（不推荐，除非特殊情况）：

1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`
3. 创建 Git 标签: `git tag v1.0.0`
4. 推送标签: `git push origin v1.0.0`
5. 在 GitHub 上创建 Release

## 故障排除

### Release PR 没有自动创建

可能原因：
1. 工作流没有正确配置或没有运行
2. 提交信息不符合 Conventional Commits 规范
3. 没有新的提交需要发布

解决方案：
- 检查 GitHub Actions 工作流是否成功运行
- 查看工作流日志中的错误信息
- 确保提交信息符合规范

### 版本号不正确

可能原因：
1. 提交信息格式错误
2. 配置文件中 `release-type` 设置错误

解决方案：
- 检查提交信息是否符合 Conventional Commits 规范
- 检查 `.release-please-config.json` 配置

### CHANGELOG 格式问题

如果 CHANGELOG 格式不正确：
- Release Please 会自动维护 CHANGELOG 格式
- 不要手动编辑 CHANGELOG（除非在 Release PR 中）
- 如果格式有问题，可以在 Release PR 中手动调整

## 最佳实践

1. **使用语义化提交信息**: 始终使用 `feat:`, `fix:`, `docs:` 等前缀
2. **及时合并 Release PR**: 合并功能 PR 后，及时审查并合并 Release PR
3. **审查 CHANGELOG**: 在合并 Release PR 前，检查 CHANGELOG 是否准确
4. **使用 PR 标题**: PR 标题也会影响版本号，确保标题符合规范
5. **避免手动修改版本**: 让 Release Please 自动管理版本号

## 相关资源

- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Release Please 文档](https://github.com/googleapis/release-please)
- [Semantic Versioning](https://semver.org/)

