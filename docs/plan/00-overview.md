# OmniConvert 开发计划总览

> 计划版本: v1.0 · 2026-05-25 · 与 [PRD v2.0](../prd/OmniConv-prd.md) 对齐

## 项目目标

打造一个**本地优先、零上传、全平台**的文件转换器 OmniConvert。Web 端通过 WASM 在浏览器内完成所有转换,桌面端通过 Tauri 2.0 + Sidecar 调用原生 CLI 工具,提供与 Web 一致的 UI 但更强的性能。

## 阶段路线图

| Phase | 主题 | 文档 | 预估 | 关键产出 |
| :--- | :--- | :--- | :--- | :--- |
| 0 ✅ | 项目脚手架 | [01-bootstrap.md](./01-bootstrap.md) | 1-2 d | Nuxt 3 工程,工具链就绪 |
| 1 ✅ | UI + i18n + 主题 | [02-core-ui-i18n-theme.md](./02-core-ui-i18n-theme.md) | 2-3 d | 通用布局、shadcn-vue、zh-CN/en 双语、深浅色 |
| 2 ✅ | 上传与格式检测 | [03-file-upload-detection.md](./03-file-upload-detection.md) | 2 d | 拖拽上传、格式识别、推荐目标格式 |
| 3 ✅ | 图片引擎 | [04-image-engine.md](./04-image-engine.md) | 3 d | ImageMagick WASM,基础格式互转 |
| 4 ✅ | 音视频引擎 | [05-media-engine.md](./05-media-engine.md) | 3 d | FFmpeg WASM,音视频互转 |
| 5 ✅ | 文档引擎 | [06-document-engine.md](./06-document-engine.md) | 2-3 d | Pandoc WASM,文档互转 |
| 6 ✅ | 批量队列 + 历史 + ZIP | [07-batch-history-zip.md](./07-batch-history-zip.md) | 2-3 d | 任务队列、IndexedDB 历史、ZIP 打包(MVP) |
| 7 ✅ | i18n 补齐 9 种语言 | [08-i18n-complete.md](./08-i18n-complete.md) | 1-2 d | 11 种语言全量翻译 |
| 8 | Tauri 桌面端 | [09-tauri-desktop.md](./09-tauri-desktop.md) | 3-4 d | Win/macOS/Linux 三平台构建 |
| 9 | 部署 + CI/CD | [10-deployment.md](./10-deployment.md) | 1-2 d | Vercel 上线,GitHub Releases 发布 |

**MVP 上线点**: Phase 6 结束。Phase 7-9 是抛光、扩平台、上架发布。

## 核心约束(贯穿所有 Phase)

引自 [CLAUDE.md](../../CLAUDE.md):

- 单文件 **≤ 300 行**, UI/逻辑/状态分离
- TypeScript **strict mode**, 不允许 `any` 兜底
- **TDD**: 核心 composable / store / util 必须先写 Vitest 单测
- 敏感配置走 `.env`, 已 `.gitignore`
- WASM **必须** 在 Web Worker 中运行, 不阻塞主线程
- 命名: 组件 PascalCase, composable / dir / store camelCase, 类型 PascalCase
- 全局状态用 Pinia, 局部状态用 `ref`/`reactive`

## 技术栈速查

| 层 | 选型 |
| :--- | :--- |
| 框架 | Nuxt 3 (Vue 3 + TypeScript) |
| 样式 | Tailwind CSS + shadcn-vue |
| 状态 | Pinia |
| 国际化 | @nuxtjs/i18n |
| 主题 | @nuxtjs/color-mode |
| 测试 | Vitest + @vue/test-utils + happy-dom |
| Lint | ESLint (@nuxt/eslint) + Prettier |
| 转换引擎(Web) | @imagemagick/magick-wasm + @ffmpeg/ffmpeg + pandoc-wasm |
| 文件操作 | 原生 Drag & Drop、`idb`、`fflate` |
| 桌面端 | Tauri 2.0 + Sidecar(原生 CLI) |
| 部署 | Vercel(Web)+ GitHub Releases(桌面端) |

## 关键决策记录

- **Web 优先,桌面端最后**: Web 验证完整产品形态后再做 Tauri 封装,降低初期复杂度
- **i18n 分阶段落地**: Phase 1 上 zh-CN + en 双语框架,Phase 7 文案稳定后批量补 9 种
- **MVP 范围**: 三引擎都接通基础格式,而非单引擎深耕,以验证整体架构可行
- **Web → 桌面分流**: composable 内按 `isDesktop` 分流,WASM 与 Sidecar 走同一抽象

## 下一步

阅读 [01-bootstrap.md](./01-bootstrap.md) 开始 Phase 0。
