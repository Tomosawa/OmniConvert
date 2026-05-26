# CLAUDE.md - OmniConvert Project Constitution

## 🚨 核心规则
- 你必须严格遵守 `docs/prd/OmniConv-prd.md` 中的产品需求文档。
- **所有代码都必须进行模块化拆分**。严禁生成超过 300 行的单文件组件，必须将 UI、逻辑、状态管理分离。
- **环境变量**：所有 API 密钥等敏感信息必须存储在 `.env` 中，并确保 `.env` 被 `.gitignore` 忽略。本项目无后端数据库，所有转换在本地完成。
- 使用 **TypeScript Strict Mode**，所有类型必须明确定义。

## 🏗️ 技术架构 (Vue)
- **框架**: Nuxt 3 (Vue 3 Composition API + TypeScript)
- **样式**: Tailwind CSS + shadcn-vue
- **状态管理**: Pinia
- **文件拖拽**: 优先使用浏览器原生 Drag & Drop API，封装为自定义 Composable；若需要现成组件，使用 `vue-file-dropzone`
- **核心引擎 (全部在浏览器端运行)**:
  - 图片: `@imagemagick/magick-wasm`
  - 视频/音频: `@ffmpeg/ffmpeg`
  - 文档: `pandoc` (WASM 版本)
- **桌面端**: Tauri 2.0，通过 Sidecar 调用原生 CLI 工具
- **部署**: Vercel (Web 端)，GitHub Releases (桌面端)

## 🚀 项目结构与开发约定
- 遵循 Nuxt 3 目录结构：
  - `pages/` 路由页面
  - `components/` 可复用组件
  - `composables/` 组合式函数 (useDropZone, useConversion 等)
  - `layouts/` 布局
  - `stores/` Pinia 状态仓库
- **命名规范**：
  - Vue 组件：PascalCase 文件名 (`MyConverter.vue`)
  - 目录/Composable/Store：camelCase 文件名
  - 类型定义：`types/` 目录下，接口名 PascalCase
- **状态管理**：全局状态（如当前主题、转换任务队列）使用 Pinia，局部状态用 `ref`/`reactive`。
- **文件处理**：WASM 引擎应在 Web Worker 中运行，避免阻塞 UI；Tauri 下调用 Sidecar 由 Rust 端处理。

## 🛠️ 开发工作流
- **测试**：严格遵循 TDD 流程，为每个 Composable 和核心逻辑编写单元测试（Vitest + @vue/test-utils）。
- **代码审查**：当你完成一个主要模块后，会自动进行自检，列出所有问题点。

## 🌐 部署
- **目标平台**: Vercel (Web)
- **部署前检查**: 完成所有功能后，需生成一份 `VERCEL_DEPLOYMENT.md` 文件，包含详细的部署步骤和环境变量清单。
- **桌面端构建**: Tauri 配置文件和 CLI 工具打包由专门的脚本处理，详见 `src-tauri/`。

## 🤖 已安装的技能 (Installed Skills)
本项目安装了以下技能以增强开发效率和代码质量：
- `superpowers`: 工作流规范
- `frontend-design`: UI/UX设计
- `generating-unit-tests`: 自动生成测试
- `Context7`: 获取最新文档
本地 `.claude/skills/` 目录下已配置技能，请自动、自主地加载并套用对应技能，无需用户手动指定。

## 日志记录
每一次开发或修正了什么记录到 docs/log 文件夹里，当天的日期命名，内容简洁明了内容少量不啰嗦。