# Phase 5 — Pandoc 文档引擎

> 预估 2-3 天 · 前置: Phase 4 · 输出: 文档格式互转 + PDF 路径决策

## 目标

接入 Pandoc WASM,实现 MD ↔ DOCX ↔ HTML ↔ EPUB ↔ LaTeX 互转;PDF 路径单独评估,若 WASM 端不可行则在 UI 标注"PDF 转换需桌面版"。

## Checklist

### 调研先行(Day 1 上午)
- [ ] 评估 [pandoc-wasm](https://github.com/tweag/pandoc-wasm) 当前状态(成熟度 / 体积 / API)
- [ ] 备选: [`@diplodoc/transform`](文档转换工具链) / `marked` + `docx` + ... 组合方案
- [ ] **决策**: 在本文档底部记录最终选型与理由

### 依赖
- [ ] 安装确定的 WASM 包

### Worker
- [ ] `workers/pandocWorker.ts`:
  - 加载 Pandoc WASM
  - `convert(buffer, sourceFormat, targetFormat, options)`
  - Pandoc CLI 风格参数映射: `--from=<src> --to=<tgt> [--standalone] [--toc] ...`

### Composable
- [ ] `composables/useDocumentConversion.ts`

### 选项
- [ ] `types/documentOptions.ts`:
  ```ts
  interface DocumentOptions {
    standalone?: boolean
    toc?: boolean
    template?: string
    cssStylesheet?: string
    metadata?: Record<string, string>
  }
  ```
- [ ] `components/options/DocumentOptions.vue`

### PDF 路径
- 若 Pandoc WASM 不支持 PDF(常见情况,因依赖 LaTeX):
  - 选项 A(Web 端兜底): `MD → HTML → window.print()`(用户自己保存为 PDF)
  - 选项 B(简单纯文本→ PDF): `pdf-lib` 或 `jspdf`
  - 选项 C(明确延后): 在 UI 标注"PDF 转换请使用桌面版",Phase 8 用 Pandoc + LaTeX CLI 解决
- **推荐**: 选项 C,避免在 Web 端为 PDF 做大量降级实现

### 测试
- [ ] `tests/composables/useDocumentConversion.spec.ts`
- [ ] 手工测试:
  - MD → DOCX
  - MD → HTML(含 TOC)
  - DOCX → HTML
  - HTML → MD
  - MD → EPUB

## 验收标准

1. MD → DOCX 成功,Word 能正常打开,样式合理
2. MD → HTML 含 TOC 选项生效
3. DOCX → HTML / MD 文本内容保留
4. EPUB 输出可被 Apple Books / 阅读器打开
5. PDF 路径有明确结论(选项 A/B/C 之一)且 UI 提示一致

## 风险与备注

- Pandoc WASM 生态显著弱于 FFmpeg / ImageMagick,可能要回退到组合方案
- 如果选用 pandoc-wasm,体积可能很大,务必懒加载
- DOCX 中的复杂样式(嵌套表格、批注)可能丢失,文档要明确标注"基础格式互转,样式可能简化"
- LaTeX 双向转换在科研用户中很重要但实现复杂,可只支持 LaTeX → 其他

## 调研结论(待 Day 1 填写)

> 选用方案: _____
> 理由: _____
> PDF 处理: _____
