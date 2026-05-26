# Phase 7 — i18n 补齐 9 种语言

> 前置: Phase 6(MVP 文案稳定) · 输出: 11 种语言全量翻译

## 目标

把 zh-CN / en 之外的 9 种语言一次性补齐:繁体中文、法语、德语、西班牙语、俄语、日语、韩语、意大利语、葡萄牙语。

## 前置条件

- ✅ `zh-CN.json` 与 `en.json` 的所有键已稳定,**键名不再变动**(本 Phase 起冻结)
- ✅ 组件内严禁硬编码用户可见文案(Phase 1-6 持续 lint)

## Checklist

### 键名审计
- [ ] 扫描全部组件,确认无硬编码文案(可用 ESLint 自定义 rule 或 grep `>(中文|English)<`)
- [ ] 整理 `locales/zh-CN.json` 键名分类: `app.*`、`nav.*`、`convert.*`、`history.*`、`error.*`、`common.*`

### 翻译产出
- [ ] 用 LLM 批量生成草稿:
  - `locales/zh-TW.json`(繁中)
  - `locales/fr.json`(法)
  - `locales/de.json`(德)
  - `locales/es.json`(西)
  - `locales/ru.json`(俄)
  - `locales/ja.json`(日)
  - `locales/ko.json`(韩)
  - `locales/it.json`(意)
  - `locales/pt.json`(葡)
- [ ] 抽样人工校对(优先校对核心动作: 上传/转换/下载)
- [ ] 转换格式专有名词(JPG / PNG / DOCX 等)保持原文不翻译

### i18n 配置
- [ ] `nuxt.config.ts` 中 `locales` 数组扩展为 11 项,配 `code`、`iso`、`name`、`file`
- [ ] `LocaleToggle.vue` 用 `DropdownMenu` 列出 11 种,显示 emoji 旗帜或语言原生名

### 布局兼容
- [ ] 德语长词、俄语字符宽度、日韩竖排标点要在主要页面验证
- [ ] CJK 字体降级链与西欧字体降级链(`tailwind.config.ts`)

### 测试
- [ ] `tests/i18n/keysCoverage.spec.ts` 自动校验 11 个 JSON 键集合一致(防漏键)
- [ ] 手工切换 11 种语言,首页 + 转换页 + 历史页都看一遍

## 验收标准

1. 11 种语言切换无运行时错误
2. 所有 JSON 键覆盖率 100%(无 fallback 到 en)
3. 主要页面在德/俄/日下布局不破
4. 翻译质量"可接受"(母语者抽查不会被骂)

## 风险与备注

- 繁中(zh-TW)与简中(zh-CN)的差异不仅是字符,还有用词(如"软件" vs "軟體");LLM 草稿后必须人工校对
- 部分语言的转换专业术语(如"编码器")在该语种中无统一约定,可保留英文 + 母语解释
- 不要在 JSON 里写 HTML;复杂排版用 `<i18n-t>` 组件 + slots
