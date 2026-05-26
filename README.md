# OmniConvert

> 本地优先的全能文件转换器 — 图片、音视频、文档全部在你的浏览器内通过 WebAssembly 完成转换,**文件永不上传**。

[![Status](https://img.shields.io/badge/status-Phase%200%20Bootstrap-blue)]() [![Vue](https://img.shields.io/badge/Vue-3-42b883)]() [![Nuxt](https://img.shields.io/badge/Nuxt-3.16-00DC82)]() [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)]() [![License](https://img.shields.io/badge/license-MIT-green)]()

## 项目简介

OmniConvert 解决一件事:**安全、免费、全能地转换你的本地文件**。

- 隐私安全:所有转换在浏览器或桌面端本地完成,文件不离开你的设备
- 三大引擎:[ImageMagick](https://imagemagick.org)(图片)、[FFmpeg](https://ffmpeg.org)(音视频)、[Pandoc](https://pandoc.org)(文档)
- 全平台:Web 在线版 + Windows / macOS / Ubuntu 桌面版(Tauri 2.0)
- 现代体验:深浅色主题、11 种语言、批量队列、历史记录、ZIP 打包下载

完整需求请见 [docs/prd/OmniConv-prd.md](docs/prd/OmniConv-prd.md)。

## 当前状态

**Phase 0 — 项目脚手架(已完成)**

完整的 10 阶段开发计划见 [docs/plan/00-overview.md](docs/plan/00-overview.md):

| Phase | 主题 | 状态 |
| :--- | :--- | :--- |
| 0 | 项目脚手架 | ✅ 已完成 |
| 1 | UI + i18n + 主题 | 待开始 |
| 2 | 文件上传与格式检测 | 待开始 |
| 3 | ImageMagick 图片引擎 | 待开始 |
| 4 | FFmpeg 音视频引擎 | 待开始 |
| 5 | Pandoc 文档引擎 | 待开始 |
| 6 | 批量队列 + 历史 + ZIP(MVP) | 待开始 |
| 7 | i18n 补齐 9 种语言 | 待开始 |
| 8 | Tauri 桌面端 | 待开始 |
| 9 | 部署、CI/CD | 待开始 |

## 技术栈

- **框架**:Nuxt 3 + Vue 3 Composition API + TypeScript(strict mode)
- **样式**:Tailwind CSS + shadcn-vue(Phase 1 引入)
- **状态管理**:Pinia
- **国际化**:@nuxtjs/i18n
- **主题**:@nuxtjs/color-mode
- **测试**:Vitest + @vue/test-utils + happy-dom
- **Lint**:ESLint(@nuxt/eslint flat config) + Prettier
- **桌面端**(Phase 8):Tauri 2.0 + 原生 CLI Sidecar
- **部署**:Vercel(Web)+ GitHub Releases(桌面)

## 快速开始

前置:Node ≥ 20.11、pnpm ≥ 10。

```bash
pnpm install        # 安装依赖
pnpm dev            # http://localhost:3000
pnpm test           # 运行 Vitest 单元测试
pnpm typecheck      # 运行 vue-tsc 类型检查
pnpm lint           # 运行 ESLint
pnpm build          # 构建生产产物到 .output/
pnpm preview        # 预览 build 产物
pnpm format         # Prettier 格式化全仓库
```

## 目录结构

```
OmniConvert/
├── app.vue                # 根组件
├── nuxt.config.ts         # Nuxt 配置
├── tailwind.config.ts     # Tailwind
├── tsconfig.json          # TypeScript strict
├── vitest.config.ts       # Vitest
├── eslint.config.mjs      # Flat config
├── assets/css/            # 全局样式
├── pages/                 # 路由页面
├── layouts/               # 布局
├── components/            # PascalCase 组件
├── composables/           # camelCase use*.ts
├── stores/                # Pinia
├── types/                 # PascalCase 类型
├── workers/               # WASM Web Worker
├── utils/                 # 纯函数
├── locales/               # i18n 资源
├── tests/                 # Vitest 单测
└── docs/
    ├── prd/               # 产品需求文档
    └── plan/              # 分阶段开发计划
```

详见 [CLAUDE.md](CLAUDE.md)(开发约束与命名规范)。

## 贡献

本项目处于早期阶段,详情见 [docs/plan/00-overview.md](docs/plan/00-overview.md)。

## License

MIT
