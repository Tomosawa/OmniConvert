# Phase 6 — 批量队列 + 历史记录 + ZIP 打包 ✅

> 前置: Phase 3-5 · 输出: Web MVP 完整可演示版本
> **状态**: 已完成 (2026-05-25) · **🎉 MVP 上线就绪**

## 目标

把三个引擎统一接入任务队列,支持批量并发、历史持久化(IndexedDB)、结果预览、ZIP 打包下载。**本阶段结束即 MVP 上线点**。

## Checklist

### 任务队列(Pinia)
- [x] `stores/conversion.ts` 完整实现(Phase 3 起):
  - state: `tasks` / `items` / `concurrency`
  - actions: `addDetected` / `setTargetFormat` / `setItemOptions` / `removeItem` / `clearItems` / `clearAll`
  - 任务执行: `startConversion` / `drain` / `runOne` / `retry`
  - 状态机: `pending → running → success/error`
  - 并发控制: 默认 2,可调 1-8
- [x] **Phase 6 新增**: `setFinishedHook(fn)` 钩子,任务完成(成功/失败)时同步推送到 history

### Dispatcher
- [x] `composables/useConversionDispatcher.ts` (Phase 3-5 已写)
  - install 时同时注入 runner + finished hook
  - finished hook 把任务元数据(不含 Blob)异步 append 到 history

### 历史记录
- [x] `composables/useHistory.ts` (基于 [`idb`](https://github.com/jakearchibald/idb)):
  - DB: `omniconvert` v1, store: `history`, indexed by `completedAt`
  - API: `append(record)` / `list(limit=200)` / `remove(id)` / `clear()`
  - 自动 prune 保持最多 200 条;超出按最旧 `completedAt` 删除
  - **隐私**: 仅持久化元数据(filename / formats / sizes / durations / status / error),**不存 Blob**
  - 异常路径: IndexedDB 不可用(隐私模式)直接 silent return
  - `__resetHistoryDbForTests` 测试 seam
- [x] `pages/history.vue` — 历史记录列表 + 单条删除 + 清空全部 + 加载/空态

### ZIP 打包
- [x] `composables/useZipPacker.ts` 基于 `fflate` 流式 `zip()`:
  - 入参 `[{name, blob}]`,出参 `Promise<Blob>`(`application/zip`)
  - 重名自动加 ` (2)` / ` (3)` 后缀避免覆盖
  - level 6 压缩
  - Output Uint8Array 拷到独立 ArrayBuffer 后再 new Blob(避免 fflate 内部 buffer 复用导致的 SharedArrayBuffer 视图)
- [x] `components/BatchActions.vue`:
  - 单文件 → 直接下载
  - 多文件 → ZIP 打包,文件名 `omniconvert-<YYYY-MM-DD>.zip`
  - 状态: idle / packing / disabled(转换中)

### 结果预览
- [x] `components/ResultPreview.vue`:
  - 图片: `<img>`(已在 TaskList 卡片右侧呈现 12x12 缩略图)
  - 音频: `<audio controls>`
  - 视频: `<video controls>`
  - 文档: 显示文件名 + 大小(无内嵌预览)
- [x] TaskList 在 media 类型成功后嵌入 ResultPreview

### 错误与提示
- [x] 任务卡片 error 状态显示重试按钮 + 错误信息(Phase 3 已就位)
- [x] 总览栏显示 `<done>/<total> · <n> failed`(已就位)

### 性能
- [x] ObjectURL 在 `removeTask`/`clearTasks` 中 `URL.revokeObjectURL`(Phase 3 已就位)

### 路由 / 导航
- [x] AppHeader 中 History 链接从灰禁用改为 NuxtLink

### i18n
- [x] zh-CN/en 新增 `batch.*` / `history.*` 键集

### 测试(100/100 通过)
- [x] `tests/composables/useHistory.spec.ts` — 6 测试: 空态 / 持久化 + 倒序 / remove / clear / list 限额 / error 记录保留(用 `fake-indexeddb` 注入完整 IDB 实现,happy-dom 自带的 IDB stub 不完整)
- [x] `tests/composables/useZipPacker.spec.ts` — 3 测试: 多文件打包 + 解压验证 / 重名自动重命名 / 空入参抛错
- [x] `tests/setup.ts` 全局 `import 'fake-indexeddb/auto'` 在 vitest 启动时把 happy-dom 的 IDB 替换为 fake-indexeddb 实现

## 验收标准

1. ✅ 任务队列 + 并发上限 + retry 全套测试覆盖(Phase 3 起,共 100 用例)
2. ✅ 历史持久化 + prune + 隐私(仅元数据)路径全部测试覆盖
3. ✅ ZIP 多文件打包 + 重名处理 + 空入参容错测试覆盖
4. ✅ History 路由可访问(SSR 验证)
5. ✅ BatchActions 接入首页,完成任务多于 1 时打包,等于 1 直接下载
6. ✅ 全套验证通过: lint 0 / typecheck 0 / test 100 / build 64.2 MB / 17.7 MB gzip / dev SSR 双语 + history 路由都正常

## 风险与备注

- IndexedDB 在 Safari 隐私模式下不可用,`useHistory` 已 try/catch 兜底为 no-op
- ObjectURL 内存泄露: `removeTask`/`clearTasks` 已 revoke;BatchActions 下载完 ZIP 也 revoke
- 长任务(大视频)的 cancel 在 ffmpeg 下不容易,Phase 6 没实现 cancel,只支持 retry — 留到 Phase 8 桌面版用 process.kill 实现
- 并发上限默认 2,媒体引擎(FFmpeg)实际是单 instance 串行,加大并发只对图片/文档有意义

## 🎉 MVP DoD(已达成)

- [x] 拖入混合多类型文件,各自选目标格式,一键转换 → 全部完成 → ZIP 打包下载
- [x] 转换记录在 IndexedDB 持久化,刷新后历史还在
- [x] 失败任务能 retry
- [x] Chrome 主流浏览器已验证(其他浏览器需后续真机测试)
- [x] 全部单元测试通过

## Phase 6 实际决策与偏离记录

1. **finished hook 注入 + dispatcher 写 history,而非 store 内置 idb**
   - 原因: store 已经避免 import WASM(Phase 3),保持同样原则避免 import IndexedDB —— 让 store 在 Node/SSR 下可被序列化、可在测试里直接 setActivePinia(createPinia()) 不报错
   - 决策: store 暴露 `setFinishedHook(fn)`,`useConversionDispatcher.install()` 时一并注入 history append 闭包

2. **history 只存元数据,不存 Blob**
   - 原因: 隐私优先,且 IndexedDB 大量 Blob 会快速吃满浏览器配额
   - 决策: `HistoryRecord` 仅记 filename / formats / sizes / duration / status / error / completedAt;若用户要重新下载,从当前会话的 task 列表拿(关闭浏览器后无法回放)

3. **BatchActions 单文件直接下载、多文件 ZIP**
   - 原因: 单文件 ZIP 打包反而徒增解压步骤
   - 决策: `completed.length === 1` 走 `<a download>`;`>1` 走 fflate

4. **TaskList 内嵌 ResultPreview 仅 media 类型**
   - 原因: 图片已在卡片右侧有 12x12 缩略图,文档没法预览,只有音视频值得插入大尺寸 controls
   - 决策: ResultPreview 仅在 media 分支被 v-if 拉起

5. **vitest setup 全局装 fake-indexeddb**
   - 原因: happy-dom 16 自带的 IndexedDB 实现非常不完整(对 indexes 不工作),逐测试 mock 太重复
   - 决策: `tests/setup.ts` import `fake-indexeddb/auto`,vitest.config 配 `setupFiles`;每个 history 测试只在 beforeEach 重新 `new IDBFactory()` 切干净库

6. **保留 200 条历史 prune 由 append 内部处理**
   - 原因: 把它做到 prune action 上需要外部调用方记得调,不可靠
   - 决策: 每次 append 自动 count + 删除最旧条目,保证不超阈值;阈值后续可做成可配
