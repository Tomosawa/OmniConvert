# Phase 1 — UI 框架 + i18n + 主题

> 预估 2-3 天 · 前置: Phase 0 · 输出: 通用 UI 骨架与双语/双主题切换

## 目标

搭好整体视觉与交互基础: shadcn-vue 组件库、深浅色主题、zh-CN/en 双语、响应式布局。后续所有功能都基于此 UI 框架开发。

## Checklist

### shadcn-vue 初始化
- [ ] `pnpm dlx shadcn-vue@latest init` (选 Slate / 含 CSS 变量)
- [ ] 引入基础组件: `Button`、`Card`、`Select`、`Progress`、`Toast`(或 `Sonner`)、`Dialog`、`Tabs`、`Switch`、`Tooltip`、`DropdownMenu`、`Separator`
- [ ] `components.json` 别名规范确认

### i18n 配置(zh-CN + en)
- [ ] `nuxt.config.ts` 中配置 `@nuxtjs/i18n`:
  - `defaultLocale: 'zh-CN'`
  - `strategy: 'no_prefix'`
  - `lazy: true` + 懒加载
  - `langDir: 'locales/'`
- [ ] `locales/zh-CN.json`、`locales/en.json` 建立基础键: `app.name`、`app.tagline`、`nav.home`、`nav.history`、`theme.light`、`theme.dark`、`theme.system`、`language.label` 等
- [ ] `composables/useLocale.ts` 封装语言切换

### 主题
- [ ] `@nuxtjs/color-mode` 接入,`classSuffix: ''`
- [ ] Tailwind 启用 `darkMode: 'class'`
- [ ] CSS 变量两套(light/dark)定义在 `assets/css/tailwind.css`
- [ ] `stores/theme.ts` 包装 `useColorMode()` 当前模式

### 布局与组件
- [ ] `layouts/default.vue` = `<Header /> + <main><slot /></main> + <Footer />`
- [ ] `components/AppHeader.vue` (Logo + 主题切换 DropdownMenu + 语言切换 DropdownMenu)
- [ ] `components/AppFooter.vue` (项目链接 + 版本号)
- [ ] `components/ThemeToggle.vue` (light / dark / system 三选一)
- [ ] `components/LocaleToggle.vue` (zh-CN / en;Phase 7 扩到 11 项)

### Pinia stores 骨架
- [ ] `stores/theme.ts` (与 useColorMode 联动)
- [ ] `stores/conversion.ts` (类型先行,逻辑 Phase 6 实装):
  ```ts
  interface ConversionTask {
    id: string
    fileName: string
    sourceFormat: string
    targetFormat: string
    status: 'pending' | 'running' | 'success' | 'error'
    progress: number
    error?: string
    resultBlob?: Blob
  }
  ```

### 类型与目录
- [ ] `types/conversion.ts`
- [ ] `types/file.ts`
- [ ] `types/i18n.ts` (基于键名生成)

### 响应式
- [ ] `sm` ≥ 640、`md` ≥ 768、`lg` ≥ 1024、`xl` ≥ 1280 全局策略,Header 在 `<sm` 收成汉堡菜单(可推迟)

### 测试
- [ ] `tests/components/AppHeader.spec.ts` mount 渲染断言
- [ ] `tests/composables/useLocale.spec.ts` 切换语言时文案变化
- [ ] `tests/stores/theme.spec.ts` 主题状态切换

## 验收标准

1. 首页显示 OmniConvert 标题 + 副标题(中英文随切换变化)
2. Header 上能切主题与语言,刷新后保持(localStorage 持久化由 color-mode + i18n 自带)
3. 所有新增组件 props/emits 类型完整,无 `any`
4. `pnpm test` 全部通过
5. Chrome / Safari 各跑一遍冒烟,布局无错位

## 风险与备注

- shadcn-vue 的部分组件(如 Toast/Sonner)选型在此阶段定型,后续不再切换
- i18n 键名设计要前瞻,避免后续大改;命名空间用 `domain.scope.key` (如 `convert.image.option.quality`)
- 主题切换闪烁问题: color-mode 的 SSR/CSR 衔接需测试
