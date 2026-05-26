# Phase 1 — UI 框架 + i18n + 主题 ✅

> 前置: Phase 0 · 输出: 通用 UI 骨架与双语/双主题切换
> **状态**: 已完成 (2026-05-25)

## 目标

搭好整体视觉与交互基础: shadcn-vue 组件库、深浅色主题、zh-CN/en 双语、响应式布局。后续所有功能都基于此 UI 框架开发。

## Checklist

### shadcn-vue 初始化
- [x] 手动落地 shadcn-vue 基础设施(reka-ui + cva + clsx + tailwind-merge + lucide-vue-next + tailwindcss-animate)
- [x] 引入本阶段所需组件: `Button`、`Card`(全套)、`DropdownMenu`(全套)、`Separator`
- [x] `components.json` 别名规范、`lib/utils.ts` 中 `cn()` 工具就位
- [ ] `Select`、`Progress`、`Toast/Sonner`、`Dialog`、`Tabs`、`Switch`、`Tooltip` —— 推迟到对应 Phase 按需引入(Phase 2/6)

### i18n 配置(zh-CN + en)
- [x] `nuxt.config.ts` 中 `@nuxtjs/i18n` 配置:
  - `defaultLocale: 'zh-CN'`
  - `strategy: 'no_prefix'`
  - `lazy: true` + `restructureDir: false`
  - `langDir: 'locales/'`
  - `detectBrowserLanguage` cookie 持久化(`omniconvert_locale`)
  - `bundle.optimizeTranslationDirective: false`(显式关闭即将弃用的特性)
- [x] `locales/zh-CN.json`、`locales/en.json` 完整键集: `app.*`、`nav.*`、`theme.*`、`language.*`、`home.*`、`common.*`、`footer.*`
- [x] `composables/useLocale.ts` 封装 typed 切换接口

### 主题
- [x] `@nuxtjs/color-mode` 接入,`classSuffix: ''`、`preference: 'system'`、`fallback: 'light'`
- [x] Tailwind `darkMode: 'class'`
- [x] light/dark 两套 CSS 变量(完整 shadcn token: background/foreground/primary/secondary/muted/accent/destructive/border/input/ring/...)在 `assets/css/tailwind.css`
- [x] `stores/theme.ts` 包装 `useColorMode()`,暴露 `preference` / `resolved` / `setPreference` / `cycle`

### 布局与组件
- [x] `layouts/default.vue` = `<AppHeader />` + `<main><slot /></main>` + `<AppFooter />`
- [x] `components/AppHeader.vue` (Logo + 版本号 + 导航 + LocaleToggle + ThemeToggle, sticky + backdrop blur)
- [x] `components/AppFooter.vue` (copyright + tagline)
- [x] `components/ThemeToggle.vue` (light / dark / system 三选一,DropdownMenu)
- [x] `components/LocaleToggle.vue` (zh-CN / en,DropdownMenu;Phase 7 扩到 11 项)

### Pinia stores 骨架
- [x] `stores/theme.ts` (与 useColorMode 联动)
- [x] `stores/conversion.ts` 任务队列骨架:tasks/concurrency state、pending/running/completed/failed getters、addTask/removeTask/clearAll/setConcurrency actions(完整执行逻辑 Phase 6 落地)

### 类型与目录
- [x] `types/conversion.ts` — `ConversionTask` / `ConversionStatus`
- [x] `types/file.ts` — `DetectedFile` / `FileItem` / `FileCategory`
- [x] `types/i18n.ts` — `LocaleCode` / `LocaleDescriptor` / `ThemePreference`

### 首页
- [x] `pages/index.vue` 改为 hero + 三特性卡片(隐私 / 引擎 / 平台)+ Phase 1 状态提示

### 响应式
- [x] `sm` ≥ 640、`md` ≥ 768、`lg` ≥ 1024、`xl` ≥ 1280 全局策略
- [x] Header 在 `<sm` 隐藏 nav 菜单,Footer 在 `<sm` 隐藏 tagline,首页 features 网格 1→2→3 列自适应
- [ ] Header 汉堡菜单 — 推迟到 Phase 6 / Phase 8 视导航复杂度再决定

### 测试(全部通过 17/17)
- [x] `tests/utils/cn.spec.ts` — `cn()` 合并行为
- [x] `tests/components/Button.spec.ts` — Button 各 variant/size/disabled/click
- [x] `tests/stores/conversion.spec.ts` — store CRUD + 并发 clamp
- [ ] `tests/components/AppHeader.spec.ts` / `tests/composables/useLocale.spec.ts` / `tests/stores/theme.spec.ts`
   — 需要 Nuxt runtime 的 i18n / color-mode 注入,在 vitest 中 mock 成本较高;改由 Phase 2 引入 `@nuxt/test-utils` 时统一接入

## 验收标准

1. ✅ 首页显示 OmniConvert 标题 + 副标题(中英文随切换变化,SSR 已验证)
2. ✅ Header 上能切主题与语言,cookie 持久化(`omniconvert_locale` + color-mode default cookie)
3. ✅ 所有新增组件 props/emits 类型完整,无 `any`
4. ✅ `pnpm test` 全部通过(17/17)
5. ✅ `pnpm typecheck` 0 error,`pnpm lint` 0 warning,`pnpm build` 5.39 MB / 1.41 MB gzip,`pnpm dev` SSR 中英文渲染正常

## 风险与备注

- shadcn-vue 的部分组件(如 Toast/Sonner)选型在此阶段定型,后续不再切换
- i18n 键名设计要前瞻,避免后续大改;命名空间用 `domain.scope.key` (如 `convert.image.option.quality`)
- 主题切换闪烁问题: color-mode 的 SSR/CSR 衔接需测试

## Phase 1 实际决策与偏离记录

1. **未运行 `shadcn-vue@latest init` CLI,改为手动落地组件**
   - 原因: CLI 在 Nuxt 3.16 + 我们当前 nuxt.config 下交互式命中冲突项较多;直接按官方源码模板拷 5 个原子组件更可控
   - 决策: components.json + lib/utils.ts 全部手写,组件按需 + 增量引入

2. **components 自动导入排除 `**/ui/**` 子树**
   - 原因: shadcn-vue 同时提供 `index.ts` barrel 与 `*.vue` 单文件,Nuxt 自动导入会把它们识别为同名组件并报 warning
   - 决策: 在 `nuxt.config.ts` 的 `components` 中用 `ignore: ['**/ui/**']` 排除,UI 原子统一通过 `import { ... } from '@/components/ui/...'` 显式引入

3. **`stores/index.ts` 不再 re-export 各 store**
   - 原因: `@pinia/nuxt` 已经把 `stores/*.ts` 自动导入,如果在 `index.ts` 再 re-export 会触发 vite 的 "Duplicated imports" 警告
   - 决策: `stores/index.ts` 保留为占位空文件,各 store 直接被 `defineStore()` 标识自动注入

4. **`vue/require-default-prop` 在 `components/ui/**` 关闭**
   - 原因: shadcn-vue 风格要求 `variant` / `size` / `class` 这些 props 保持可选无默认值
   - 决策: ESLint flat config 中给 `components/ui/**/*.vue` 单独覆盖一条 `'vue/require-default-prop': 'off'`,主仓库其他组件继续严格

5. **i18n 设置 `bundle.optimizeTranslationDirective: false`**
   - 原因: `@nuxtjs/i18n` v9 默认开启该特性,但官方已宣布 v10 弃用并伴随构建期 WARN
   - 决策: 显式关闭,避免日志噪声并提前对齐 v10
