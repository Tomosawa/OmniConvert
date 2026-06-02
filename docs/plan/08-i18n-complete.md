# Phase 7 — i18n 补齐 9 种语言 ✅

> 前置: Phase 6(MVP 文案稳定) · 输出: 11 种语言全量翻译
> **状态**: 已完成 (2026-05-25)

## 目标

把 zh-CN / en 之外的 9 种语言一次性补齐:繁体中文、法语、德语、西班牙语、俄语、日语、韩语、意大利语、葡萄牙语。

## 前置条件

- ✅ `zh-CN.json` 与 `en.json` 的所有键已稳定,**键名不再变动**(本 Phase 起冻结)
- ✅ 组件内严禁硬编码用户可见文案(grep 验证通过)

## Checklist

### 键名审计
- [x] 全仓库 grep 搜中文 / 英文标题文案,确认所有用户可见文案都走 `t(...)`
- [x] zh-CN.json 共 92 个叶子键,8 个命名空间(app/nav/theme/language/home/upload/convert/task/batch/history/imageOptions/mediaOptions/documentOptions/fileCard/largeFile/common/footer)

### 翻译产出
- [x] `locales/zh-TW.json`(繁中)
- [x] `locales/fr.json`(法)
- [x] `locales/de.json`(德)
- [x] `locales/es.json`(西)
- [x] `locales/ru.json`(俄)
- [x] `locales/ja.json`(日)
- [x] `locales/ko.json`(韩)
- [x] `locales/it.json`(意)
- [x] `locales/pt.json`(葡)
- [x] 占位符(`{count}` / `{n}` / `{threshold}` / `{version}`)在所有语言中保留
- [x] 转换格式专有名词(JPG / PNG / DOCX 等)保持原文不翻译

### i18n 配置
- [x] `nuxt.config.ts` 中 `locales` 数组扩展为 11 项,每项配 `code`/`iso`/`name`/`file`
- [x] 语言原生名:简体中文 / 繁體中文 / English / Français / Deutsch / Español / Русский / 日本語 / 한국어 / Italiano / Português

### 类型
- [x] `types/i18n.ts` 中 `LocaleCode` 联合类型扩展为 11 种,后续切换有静态检查

### 布局兼容
- [x] dev SSR 验证 11 种语言关键字符串都正确渲染(德语长词、俄语字符、日韩 CJK 都过)

### 测试(128/128 通过)
- [x] `tests/i18n/keysCoverage.spec.ts` — 28 测试:
  - locale 数量精确为 11
  - 11 个 JSON 键集完全等于 zh-CN(防漏键 / 防多键)
  - 11 个 JSON 没有空叶子字符串
  - 5 个含占位符的关键键(`app.version` / `upload.selected` / `task.failedCount` / `batch.downloadZip` / `largeFile.description`)在所有语言中保留对应占位符
  - 测试用 `node:fs` 同步加载 JSON,绕开 vitest + vue plugin 对动态 import 名空间的处理差异

## 验收标准

1. ✅ 11 种语言切换无运行时错误(SSR cookie-based 都过)
2. ✅ 所有 JSON 键集合完全一致(自动测试覆盖)
3. ✅ 主要页面在德/俄/日下布局不破(dev SSR 验证)
4. ✅ 占位符在所有语言中保留(自动测试覆盖)
5. ✅ 全套验证通过: lint 0 / typecheck 0 / test 128 / build 64.3 MB / 17.7 MB gzip / dev SSR 11 种语言全部正常

## 风险与备注

- 翻译质量:本阶段 LLM 草稿,长期需要母语者抽查;占位符已自动测试保证不会漏
- 部分专业术语(如"比特率")各语种约定不一,保留浏览器/系统已有约定即可
- 不在 JSON 里写 HTML;复杂排版用 `<i18n-t>` 组件 + slots(本阶段未触发)
- LocaleToggle 已经动态读 `useI18n().locales`,无需修改即可显示 11 项

## Phase 7 实际决策与偏离记录

1. **测试 JSON 加载用 `node:fs`,而非 ESM `import`**
   - 原因: vitest 在 vue plugin 介入下对 JSON `import` 的命名空间处理在 11 个 import 时触发 `(0, default) is not a function` 错误,排查耗时
   - 决策: 测试中用 `readFileSync + JSON.parse`,简单可靠

2. **占位符断言写到测试中,而非翻译文档**
   - 原因: 漏占位符是最容易引入的翻译 bug,且影响运行时(`{count}` 不替换会直接显示原文)
   - 决策: `keysCoverage.spec.ts` 内置 5 条占位符断言;新增带占位符的键时需要同时加测试条目

3. **LocaleCode 类型联合扩到 11 种**
   - 原因: `useLocale().switchTo` 接受 LocaleCode,Phase 7 的 nuxt.config 增加 9 个 code 不能让 TS 还认 union 只有 zh-CN/en
   - 决策: types/i18n.ts 同步扩展;LocaleToggle 不需要改(动态读 locales)
