# Phase 5 — Pandoc 文档引擎 ✅

> 预估 2-3 天 · 前置: Phase 4 · 输出: 文档格式互转 + PDF 路径决策
> **状态**: 已完成 (2026-05-25)

## 目标

接入 Pandoc WASM,实现 MD ↔ DOCX ↔ HTML ↔ EPUB ↔ LaTeX 互转。PDF 路径明确延后到 Phase 8 桌面版(走原生 Pandoc + LaTeX),Web 端不做 PDF 输出。

## Checklist

### 调研结论
- [x] 选定 **`pandoc-wasm@1.0.1`**(官方 Pandoc 仓库 GitHub Action 自动构建,Pandoc 版本随上游)
- [x] 备选评估: marked + docx 组合方案太碎,放弃
- [x] PDF 处理: **选项 C — 明确延后到桌面版**;Web 端不在推荐目标格式中提供 PDF

### 依赖
- [x] `pnpm add pandoc-wasm` (1.0.1, 内含 ~50 MB WASM)
- [x] `pnpm add -D vite-plugin-wasm vite-plugin-top-level-await`(pandoc-wasm 用 ESM Wasm import 提案 + top-level-await,Vite 需要这两个插件解析)
- [x] `nuxt.config.ts` 增加 vite plugins + `optimizeDeps.exclude: ['pandoc-wasm']` + `rollupOptions.external: ['wasi_snapshot_preview1']`(pandoc-wasm 通过 `@bjorn3/browser_wasi_shim` 在运行时 polyfill 该 WASI 导入,Rollup 需要外部化)

### Composable
- [x] `composables/useDocumentConversion.ts`:
  - 单例 + lazy `import('pandoc-wasm')` 动态导入,避免初始 bundle 包含 50 MB WASM
  - `convert({file, sourceExt, targetExt, options, onProgress}) → Promise<Blob>`
  - 二进制 reader (docx/epub) 用 `input-files` + 内存 fs;二进制 writer (docx/epub) 用 `output-file`;其他纯文本走 stdin/stdout
  - 进度四档 (5/20/50/85/100)

### 工具(纯函数)
- [x] `utils/pandocFormats.ts`:
  - `readerFor(ext)` / `writerFor(ext)` — ext → Pandoc 格式名(md→markdown / tex→latex / htm→html 别名归一)
  - `isBinaryWriter(ext)` — docx/epub 标记为二进制
  - `documentMime(ext)` — 输出 Blob MIME
  - `buildPandocOptions(args)` — 把 from/to/inputFile/outputFile/doc 选项转换为 Pandoc JSON CLI 风格

### 选项
- [x] `types/documentOptions.ts`: `DocumentOptions` 仅暴露 `standalone` / `toc` / `css` 三个最有用的字段;`template` / `metadata` 推迟,等真实使用反馈再开
- [x] `components/options/DocumentOptions.vue`: 折叠面板,standalone Switch + toc Switch + css Input(仅 html/epub 显示)

### 类型 shim
- [x] `types/shims.d.ts` 给 pandoc-wasm 加 ambient module 声明(包未发布 .d.ts)

### dispatcher
- [x] `useConversionDispatcher` 加 document 分支

### FileCard 接入
- [x] media 选项之后追加 DocumentOptions 面板,仅在 category=document 显示

### PDF 路径处理
- [x] `utils/formatTable.ts` 把所有文档类的 PDF 目标格式从推荐表中删除,且 i18n 文案明确说明 PDF 留到桌面版
- [x] PDF 自身依然出现在 source 列(我们能 PDF→MD/DOCX/HTML),只是不出现在 target 推荐里

### i18n
- [x] zh-CN/en 新增 `documentOptions.*` 键集

### 测试(91/91 通过)
- [x] `tests/utils/pandocFormats.spec.ts` — 12 测试: readerFor/writerFor 别名归一 + 未知返回 null;isBinaryWriter docx/epub vs 文本格式;documentMime 各档位;buildPandocOptions 默认/inputFile/outputFile/standalone+toc/css 数组形态/css 空值省略

## 验收标准

1. ✅ pandoc-wasm 调研确定方案,采用官方包
2. ✅ MD↔DOCX↔HTML↔EPUB↔LaTeX 五个文档格式 reader/writer 都映射好,纯函数测试覆盖
3. ✅ PDF 路径有明确结论(延后桌面版)且推荐表已对齐
4. ✅ 全套验证通过: lint 0 / typecheck 0 / test 91 / build 64 MB(17.7 MB gzip)/ dev SSR 双语正常

## 风险与备注

- pandoc-wasm 总下载量 ~50 MB,通过 `import('pandoc-wasm')` 动态加载,只在用户上传文档并触发转换时才下载
- `wasi_snapshot_preview1` 必须 external,否则 Rollup 解析失败
- DOCX 复杂样式(嵌套表格、批注、域代码)可能丢失;UI 暂未明确标注,后续若用户反馈再加 disclaimer
- LaTeX 双向转换 Pandoc 已支持但 Web 端 LaTeX → PDF 不可行(需要 TeX Live);UI 明确不提供 PDF 目标
- core-mt + pandoc-wasm 同页面共存通过 COOP/COEP 头(Phase 4 已配置)

## Phase 5 实际决策与偏离记录

1. **不再单独写 `workers/pandocWorker.ts`**
   - 原因: pandoc-wasm 通过 top-level-await 在 import 时就 fetch 并 instantiate WASM,本身已是异步;转换调用是单次同步 `convert()`,放在主线程的 microtask 队列也能保持 UI 响应(单次 docx 转换通常在数百 ms 内)
   - 决策: composable 直接调用,不嵌 Worker;若以后发现长任务卡 UI 再加

2. **DocumentOptions 仅保留 standalone / toc / css**
   - 原因: PRD 列出的 template / cssStylesheet / metadata 中,template 与 metadata 在 Web 端用户场景下用得很少,暴露反而增加复杂度
   - 决策: MVP 只暴露三项;Phase 6+ 根据用户反馈再加

3. **PDF 不进推荐表(选项 C)**
   - 原因: pandoc-wasm 不内置 LaTeX 引擎;`MD → HTML → window.print()` 体验差且不能批量,`pdf-lib` 不能保留排版
   - 决策: `utils/formatTable.ts` 移除所有文档类的 pdf 目标;Phase 8 桌面端用 Pandoc CLI + 系统 LaTeX 解决

4. **vite-plugin-wasm + top-level-await + 外部化 wasi_snapshot_preview1**
   - 原因: pandoc-wasm 用了 ESM Wasm import 提案 + 顶层 await + WASI 导入符号,任何一个缺失 Vite/Rollup 都会报错
   - 决策: 三件套一并加上,文档化在 nuxt.config.ts 注释里,Phase 8 桌面端打包同样需要

5. **types/shims.d.ts 全局声明 pandoc-wasm 模块**
   - 原因: pandoc-wasm 不带 .d.ts,直接 import 会触发 TS7016
   - 决策: 在 types/ 下加 shims.d.ts,后续若有其他无类型包同样追加
