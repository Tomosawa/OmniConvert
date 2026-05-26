# Phase 6 — 批量队列 + 历史记录 + ZIP 打包

> 预估 2-3 天 · 前置: Phase 3-5 · 输出: Web MVP 完整可演示版本

## 目标

把三个引擎统一接入任务队列,支持批量并发、历史持久化(IndexedDB)、结果预览、ZIP 打包下载。**本阶段结束即 MVP 上线点**。

## Checklist

### 任务队列(Pinia)
- [ ] `stores/conversion.ts` 完整实现:
  - state: `tasks: ConversionTask[]`、`runningCount: number`、`concurrency: number`(默认 2)
  - actions:
    - `addFiles(files)` — 接 Phase 2
    - `runAll()` — 启动调度
    - `cancel(taskId)` / `pause(taskId)` / `retry(taskId)`
    - `removeTask(taskId)` / `clearAll()`
  - 状态机: `pending → running → success / error`(error 可 retry)

### Dispatcher
- [ ] `composables/useConversionDispatcher.ts`:
  - 根据 `task.detected.category` 路由到 `useImageConversion / useMediaConversion / useDocumentConversion`
  - 控制并发(简单的 `while running < concurrency: pickPending().run()`)
  - 错误隔离(单任务失败不影响其他)

### 历史记录
- [ ] `composables/useHistory.ts`(基于 [`idb`](https://github.com/jakearchibald/idb)):
  - `append(record)` / `list({ limit, offset })` / `clear()` / `delete(id)`
  - schema: `{ id, fileName, sourceFormat, targetFormat, sizeBytes, durationMs, completedAt }`
  - 默认保留最近 200 条,可配置
  - **不持久化文件 Blob**(隐私考虑),用户需手动下载;若要保留则做 24h 过期清理
- [ ] `pages/history.vue` — 历史记录列表 + 清空 + 重新下载(若 Blob 在内存)

### ZIP 打包
- [ ] `pnpm add fflate`
- [ ] `composables/useZipPacker.ts`:
  - `pack(files: { name: string; blob: Blob }[]): Promise<Blob>`
  - 用 `fflate.zipSync` 或 `zip` 流式 API
- [ ] `components/BatchActions.vue`:
  - "全部下载" 按钮 → 单文件直接下载,多文件触发 ZIP

### 结果预览
- [ ] `components/ResultPreview.vue`:
  - 图片: `<img :src="objectURL">`
  - 音频: `<audio controls>`
  - 视频: `<video controls>`
  - 文档: 显示文件名 + 大小(无内嵌预览)
- [ ] `components/FileCard.vue` 完成后展开预览区

### 错误与提示
- [ ] Toast(shadcn-vue Sonner)在任务完成/失败时通知
- [ ] 任务卡片错误状态显示重试按钮
- [ ] 全部完成后总览栏显示统计 "8 success / 1 error"

### 性能
- [ ] 列表项 > 50 时考虑虚拟滚动(可推迟,先性能测试)
- [ ] ObjectURL 在卡片销毁时 `URL.revokeObjectURL` 防内存泄露

### 测试
- [ ] `tests/stores/conversion.spec.ts`(状态机 + 并发限制)
- [ ] `tests/composables/useConversionDispatcher.spec.ts`(category 路由)
- [ ] `tests/composables/useHistory.spec.ts`(IndexedDB CRUD,用 fake-indexeddb)
- [ ] `tests/composables/useZipPacker.spec.ts`(打包后能解压并文件名正确)

## 验收标准 (MVP DoD)

1. 拖入混合 10 个文件(3 图 + 3 音视频 + 4 文档)→ 各自选目标格式
2. 一键转换 → 进度独立更新,并发不超过 2
3. 全部完成后能逐个下载或 ZIP 一次下载
4. 刷新页面 → 历史记录页能看到本次转换记录
5. 失败场景能 retry
6. Chrome / Safari / Firefox 主流浏览器都能跑
7. 所有单测通过
8. **可发布到 Vercel 预览**

## 风险与备注

- IndexedDB 在 Safari 隐私模式下不可用,需 try/catch 降级到 localStorage
- ObjectURL 内存泄露需小心;统一在 store 的 `removeTask` 中 revoke
- 长任务(大视频)的 cancel: ffmpeg-wasm 没有官方 cancel API,可能需要 terminate Worker 重建
- 并发数过高(>3)在 WASM 引擎下可能导致 OOM,默认 2 较稳妥
