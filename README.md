# OmniConvert

> 本地优先的全能文件转换器 — 图片、音视频、文档全部在你的设备本地完成转换，**文件永不上传**。

**中文** | [English](README.en.md)

[![Status](https://img.shields.io/badge/status-v0.1.0-brightgreen)](https://github.com/tomosawa/OmniConvert/releases) [![Vue](https://img.shields.io/badge/Vue-3-42b883)]() [![Nuxt](https://img.shields.io/badge/Nuxt-3.16-00DC82)]() [![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB)]() [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)]() [![License](https://img.shields.io/badge/license-MIT-green)]()

## 项目简介

OmniConvert 解决一件事：**安全、免费、全能地转换你的本地文件**。

- 隐私安全：所有转换在浏览器或桌面端本地完成，文件不离开你的设备
- 三大引擎：[ImageMagick](https://imagemagick.org)（图片）、[FFmpeg](https://ffmpeg.org)（音视频）、[Pandoc](https://pandoc.org)（文档）
- 全平台：Web 在线版 + Windows / macOS / Linux 桌面版（Tauri 2.0）
- 现代体验：深浅色主题、11 种语言、批量队列、历史记录、ZIP 打包下载

完整需求请见 [docs/prd/OmniConv-prd.md](docs/prd/OmniConv-prd.md)。

## 下载

桌面安装包发布在 [GitHub Releases](https://github.com/tomosawa/OmniConvert/releases)：

- macOS（Apple Silicon）：`OmniConvert_0.1.0_aarch64.dmg`
- Windows（x64）：`OmniConvert_0.1.0_x64-setup.exe`（NSIS 安装包）、`OmniConvert_0.1.0_x64_en-US.msi`（MSI 安装包）
- Linux 版本需在对应平台自行构建，详见下方「桌面端开发」

Web 版以静态产物包 `OmniConvert_0.1.0_web.zip` 发布，也可以使用 Docker 镜像运行。

### Web 端发布（dist 打包）

```bash
pnpm generate        # 生成 SSG 静态产物到 .output/public
# 打包为发布用 zip（PowerShell）
Compress-Archive -Path .output/public/* -DestinationPath OmniConvert_0.1.0_web.zip
```

## 当前状态

**v0.1.0 — Web MVP + macOS / Windows 桌面端已发布**

完整的 10 阶段开发计划见 [docs/plan/00-overview.md](docs/plan/00-overview.md)：

| Phase | 主题 | 状态 |
| :--- | :--- | :--- |
| 0 | 项目脚手架 | ✅ 已完成 |
| 1 | UI + i18n + 主题 | ✅ 已完成 |
| 2 | 文件上传与格式检测 | ✅ 已完成 |
| 3 | ImageMagick 图片引擎 | ✅ 已完成 |
| 4 | FFmpeg 音视频引擎 | ✅ 已完成 |
| 5 | Pandoc 文档引擎 | ✅ 已完成 |
| 6 | 批量队列 + 历史 + ZIP（MVP） | ✅ 已完成 |
| 7 | i18n 补齐 9 种语言 | ✅ 已完成 |
| 8 | Tauri 桌面端 | ✅ 已完成（v0.1.0） |
| 9 | 部署、CI/CD | 待开始 |

## 技术栈

- **框架**：Nuxt 3 + Vue 3 Composition API + TypeScript（strict mode）
- **样式**：Tailwind CSS + shadcn-vue
- **状态管理**：Pinia
- **国际化**：@nuxtjs/i18n
- **主题**：@nuxtjs/color-mode
- **测试**：Vitest + @vue/test-utils + happy-dom
- **Lint**：ESLint（@nuxt/eslint flat config）+ Prettier
- **桌面端**：Tauri 2.0 + 原生 CLI Sidecar
- **部署**：Vercel（Web）+ GitHub Releases（桌面）

## 快速开始

前置：Node ≥ 20.11、pnpm ≥ 10。

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动 Web 开发服务器 http://localhost:3000
pnpm generate       # 生成 SSG 静态产物（桌面端构建需要）
pnpm test           # 运行 Vitest 单元测试
pnpm typecheck      # 运行 vue-tsc 类型检查
pnpm lint           # 运行 ESLint
pnpm build          # 构建生产产物到 .output/
pnpm preview        # 预览 build 产物
pnpm format         # Prettier 格式化全仓库
```

## 桌面端开发（Tauri）

前置：Rust ≥ 1.70、Tauri CLI ≥ 2.0（`pnpm add -D @tauri-apps/cli`）。

### 开发模式

```bash
pnpm tauri:dev      # 启动桌面端开发模式（Tauri 自动启动 Nuxt dev server + 原生窗口）
```

> 开发模式下，Tauri 会自动执行 `pnpm dev` 启动 Nuxt 开发服务器（`http://localhost:3000`），然后在原生窗口中加载该页面。支持热更新。

### 构建 Release

```bash
pnpm generate       # 先生成 SSG 静态产物
pnpm tauri:build    # 构建桌面端安装包（.dmg / .app / .exe / .deb）
```

> 构建前 Tauri 会自动执行 `pnpm generate` 生成静态页面，然后打包为平台安装包。产物在 `src-tauri/target/release/bundle/` 下。

### Sidecar 二进制

桌面端使用原生 CLI 工具（ImageMagick / FFmpeg / Pandoc）作为 Sidecar，二进制文件位于 `src-tauri/binaries/` 下。首次开发或构建前，确保二进制文件存在：

```bash
pnpm tauri:prepare-binaries   # 自动检测平台并拷贝系统安装的 CLI 到 src-tauri/binaries/
```

也可手动下载二进制放入 `src-tauri/binaries/`，文件名必须匹配 Tauri 平台 triple：

- macOS ARM64：`ffmpeg-aarch64-apple-darwin`、`magick-aarch64-apple-darwin`、`pandoc-aarch64-apple-darwin`
- macOS Intel：`ffmpeg-x86_64-apple-darwin`、`magick-x86_64-apple-darwin`、`pandoc-x86_64-apple-darwin`
- Windows：`ffmpeg-x86_64-pc-windows-msvc.exe` 等
- Linux：`ffmpeg-x86_64-unknown-linux-gnu` 等

### 架构说明

| 环境 | 引擎 | 文件路径 |
| :--- | :--- | :--- |
| Web | WASM（浏览器内） | `composables/use*Conversion.ts` |
| 桌面 | Sidecar（原生 CLI） | `composables/useDesktop*Conversion.ts` |

桌面端通过 `useConversionDispatcher` 自动分流 — 检测 `window.__TAURI_INTERNALS__` 判断平台，桌面端使用 Sidecar，Web 端使用 WASM。

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
├── docker/                # Docker 部署文件
│   ├── Dockerfile         # 多阶段构建（x86/nginx）
│   └── nginx.conf         # Nginx 配置（含 COOP/COEP）
├── locales/               # i18n 资源
├── tests/                 # Vitest 单测
└── docs/
    ├── prd/               # 产品需求文档
    └── plan/              # 分阶段开发计划
```

详见 [CLAUDE.md](CLAUDE.md)（开发约束与命名规范）。

## Docker 部署

### 构建镜像（x86 架构）

在项目根目录执行：

```bash
docker build -f docker/Dockerfile --platform linux/amd64 -t omniconvert:latest .
```

### 导出镜像为 tar 文件

```bash
docker save omniconvert:latest -o docker/omniconvert.tar
```

> 镜像 tar 文件体积较大，已加入 `.gitignore`，不会提交到仓库。

### 上传到 Ubuntu 服务器

```bash
scp omniconvert.tar user@your-server:/path/to/deploy/
```

### 在服务器上加载并运行

```bash
docker load -i omniconvert.tar
docker run -d -p 5000:5000 --name omniconvert --restart unless-stopped omniconvert:latest
```

访问 `http://your-server:5000` 即可使用。

### 常用运维命令

```bash
docker stop omniconvert          # 停止
docker start omniconvert         # 启动
docker rm omniconvert            # 删除容器
docker logs omniconvert          # 查看日志
docker ps                        # 查看运行状态
curl http://localhost:5000/health  # 健康检查
```

## 贡献

欢迎提交 Issue 与 Pull Request。

## License

MIT
