## 前端融合与同步指南

面向：接收前端同事更新的设计稿/代码，将其与 Astro 内容层对齐并上线。

### 同步流程（每次前端更新）
1) 拉取前端交付物  
   - 获取新的 `team_frontend.zip` 或仓库提交，解压到临时目录（例如 `temp_frontend/`）。  
   - 只迁移 React 组件和静态资源，保持 Astro 侧的数据契约不变。

2) 组件落位  
   - 页面组件放到 `src/components/react/pages/`（Home/People/Projects/News/Publications/Library）。  
   - 布局组件放到 `src/components/react/layout/`（如 `ReactBaseLayout.tsx`）。  
   - 背景/动效放到 `src/components/react/`（如 `RippleBackground.tsx`），纹理放 `public/background.jpg`。  
   - 若有新的图标/动画/工具函数，放入同级 `utils/` 或 `components/react/`，避免散落。

3) 数据对接（Astro → React）  
   - Astro 页面负责取数：`src/pages/[lang]/*/index.astro` 使用 `getCollection()`。  
   - 保持 props 形状不变；若前端新增字段，仅在 Astro 页面做映射和类型补充。  
   - 不在 React 组件内发请求或访问文件系统，确保静态可构建。

4) 依赖与类型  
   - 新增依赖写入 `package.json`，运行 `npm install`（遇到 r3f/React peer 冲突可用 `npm install --legacy-peer-deps`）。  
   - 若缺少类型，补充 `@types/*` 或在 `src/types/stubs.d.ts` 临时声明。

5) 运行与验证  
   - `npm run dev` 本地查看。重点检查：背景/动效加载、导航/语言切换、内容渲染、控制台无报错。  
   - 若只替换背景图，直接覆盖 `public/background.jpg`，无需改代码。

### 可删除与不可删除
- 可删除：  
  - 临时解压目录（如 `temp_frontend/`）。  
  - 压缩包 `team_frontend.zip`（导入完成后）。  
  - `.astro/` 构建产物、`dist/`（可重建）。  
- 不可删除（关键契约/运行所需）：  
  - `scripts/setup-content.mjs`（内容同步与附件复制）。  
  - `src/content/config.ts`、`src/content/` 下的集合入口（数据契约）。  
  - `src/pages/[lang]/*` Astro 页面包装层（数据到 UI 的桥梁）。  
  - `src/components/react/RippleBackground.tsx`、`src/components/react/layout/ReactBaseLayout.tsx`（全局背景与布局）。  
  - `public/background.jpg`、`public/attachments/`（背景与资产输出）。  
  - `astro.config.mjs`、`tsconfig.json`、`src/types/stubs.d.ts`（构建与类型配置）。  
  - `package.json`、`package-lock.json`（依赖锁定）。

### 快速自检清单
- [ ] 前端组件已放到 `src/components/react/...`，未混入 Astro 层。  
- [ ] Astro 页面依然用 `getCollection()` 取数并传 props。  
- [ ] 背景图位于 `public/background.jpg`，Ripple 动效正常。  
- [ ] 新依赖已安装并无 peer 冲突。  
- [ ] `npm run dev` 无错误，路由和语言切换正常。

