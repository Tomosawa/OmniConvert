# Phase 0 — 项目脚手架 ✅

> 前置: 无 · 输出: 可启动的 Nuxt 3 工程
> **状态**: 已完成 (2026-05-25)

## 目标

把 Nuxt 3 + TypeScript 工程从零拉起,工具链全部就位,`pnpm dev` 能正常启动并显示首页。

## 范围

**做**:
- Nuxt 3 工程初始化(strict TS)
- Tailwind CSS、Pinia、@nuxtjs/i18n、@nuxtjs/color-mode 模块安装(配置最小化)
- Vitest + happy-dom 测试环境
- ESLint + Prettier
- 目录结构搭好
- 一个最小冒烟测试与一个占位首页
- git init 与首次 commit

**不做**(留给 Phase 1+):
- shadcn-vue 组件批量引入(只做 init 准备)
- 完整 Header / Layout
- 主题切换 UI
- i18n 文案

## Checklist

### 环境与配置文件
- [x] `.gitignore`
- [x] `.env.example`
- [x] `package.json` (含 `dev`/`build`/`generate`/`preview`/`test`/`test:ui`/`lint`/`typecheck` 脚本)
- [x] `nuxt.config.ts` (注册模块: `@pinia/nuxt`、`@nuxtjs/color-mode`、`@nuxtjs/i18n`、`@nuxt/eslint`;PostCSS 直接配 Tailwind)
- [x] `tsconfig.json` (`strict: true`, `noUncheckedIndexedAccess: true`)
- [x] `tailwind.config.ts`
- [x] `assets/css/tailwind.css` (含 `@tailwind base/components/utilities` 与 light/dark CSS 变量基础)
- [x] `vitest.config.ts` (happy-dom 环境, 别名)
- [x] `eslint.config.mjs` (Nuxt 3 flat config)
- [x] `.prettierrc` + `.prettierignore`
- [x] `.npmrc` (`shamefully-hoist=true` 兼容部分依赖)

### 目录结构
```
pages/        # 路由
components/   # 组件 (PascalCase)
composables/  # use*.ts (camelCase)
layouts/      # 布局
stores/       # Pinia
types/        # PascalCase 类型
workers/      # WASM Worker
utils/        # 纯函数
locales/      # i18n 资源
assets/css/   # 样式
public/       # 静态文件
tests/        # 单元测试
```

每个目录放一个 `.gitkeep`(为空时)。

### 占位代码
- [x] `pages/index.vue` — 显示 "OmniConvert" 标题(含中文 tagline)
- [x] `app.vue` — 渲染 `<NuxtLayout><NuxtPage /></NuxtLayout>`
- [x] `layouts/default.vue` — Header / main slot / Footer 占位
- [x] `tests/smoke.spec.ts` — 最小测试,确保测试框架运行
- [x] `locales/zh-CN.json` — i18n 基础键(`app.name` / `app.tagline` / `home.bootstrapNotice`)

### 验证命令(全部通过)
```bash
pnpm install        # 25.1s ✅
pnpm typecheck      # ✅
pnpm lint           # ✅ 0 error
pnpm test           # ✅ 2 passed
pnpm build          # ✅ 2.13 MB / 527 kB gzip
pnpm dev            # ✅ http://localhost:3000 SSR 渲染含 "OmniConvert"
```

### git
- [x] `git init -b main`
- [x] 首次 commit: `chore: bootstrap Nuxt 3 project (Phase 0)`

## 验收标准

1. `pnpm dev` 启动后访问 `http://localhost:3000` 看到 "OmniConvert" 标题
2. `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 全部通过
3. 仓库已初始化为 git 仓库且首次提交完成
4. 计划文档 `docs/plan/00-overview.md` 至 `docs/plan/10-deployment.md` 全部就位

## 风险与备注

- pnpm 包安装可能遇到网络问题,如失败可尝试 `pnpm config set registry https://registry.npmmirror.com` 后重试
- shadcn-vue 的 init 涉及交互式配置,放到 Phase 1 处理,避免阻塞 Phase 0
- @nuxtjs/i18n v9+ 与 Nuxt 3.x 的兼容性需验证,如有问题降级到 v8

## Phase 0 实际决策与偏离记录

执行过程中遇到的几个问题与最终决策,后续 Phase 直接复用结论:

1. **Nuxt 锁定到 `~3.16.2`,而非默认最新 3.21**
   - 原因: Nuxt 3.21 间接依赖 `oxc-parser@0.131.0`,该版本要求 Node `^20.19.0 || >=22.12.0`;当前环境 Node 20.15.1 加载原生 binding 失败,导致 `nuxt prepare` 无法生成 `.nuxt/types/plugins.d.ts`
   - 决策: 锁到 3.16.2(对应 oxc-parser 0.70.x,与 Node 20.15 兼容)。后续若升级 Node 到 22.12+,再考虑解锁

2. **去掉 `@nuxtjs/tailwindcss` wrapper,改用原生 PostCSS + Tailwind 3.4**
   - 原因: `@nuxtjs/tailwindcss@6.14.0` 在 Nuxt 3.16 + Vite 6 下抛 `Cannot use 'import.meta' outside a module`
   - 决策: 直接安装 `tailwindcss` `postcss` `autoprefixer` `postcss-import`,在 `nuxt.config.ts` 的 `postcss.plugins` 里显式注册。功能等价、构建成功

3. **`@nuxtjs/i18n` v9 设置 `restructureDir: false`**
   - 原因: v9 默认在 `i18n/` 子目录下找 locale 文件,与 CLAUDE.md 约定的 `locales/` 顶级目录冲突
   - 决策: 关闭重构以保持目录约定;Phase 7 补齐 9 种语言时不受影响

4. **`@vitejs/plugin-vue` 锁到 5.x**
   - 原因: 6.x 仅兼容 Vite 7,而 Nuxt 3.16 内置 Vite 6,vitest 类型会与 plugin-vue 6 冲突
   - 决策: 锁到 5.2.4

5. **`vitest.config.ts` 从 typecheck 范围内排除**
   - 原因: vitest 3.x 拉的 vite 7 类型 与 Nuxt 内 vite 6 类型在同一 ts 编译单元下不兼容
   - 决策: 在 `tsconfig.json` 中 `exclude: ["vitest.config.ts"]`;`vitest.config.ts` 不参与 Nuxt 类型检查,不影响功能

6. **ESLint 的 `@typescript-eslint/consistent-type-imports` 规则下线**
   - 原因: 该规则需要 typed linting(parser project 配置),Phase 0 阶段引入会复杂化 lint
   - 决策: Phase 0 暂关,后续若需要可在 Phase 1 起开启 typed linting
