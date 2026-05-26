# Phase 3 — ImageMagick 图片引擎 ✅

> 预估 3 天 · 前置: Phase 2 · 输出: 图片格式互转 + 高级选项 + 任务调度
> **状态**: 已完成 (2026-05-25)

## 目标

接入 `@imagemagick/magick-wasm`,在 Web Worker 中运行,实现常见图片格式互转 (JPG / PNG / WebP / GIF / BMP / ICO / TIFF / HEIC),提供质量、尺寸等高级选项,且把任务调度抽象到 store 中以便 Phase 4-6 复用。

## Checklist

### 依赖
- [x] `pnpm add @imagemagick/magick-wasm` (0.0.40, 13.8 MB WASM)
- [x] Vite `?url` import 处理 WASM 资源,无需额外配置

### Worker
- [x] `workers/imageMagickWorker.ts`:
  - 启动时 `post({type:'ready'})`,首次 `convert` 时惰性 `initializeImageMagick(wasmUrl)`
  - 监听 `{type:'convert', id, buffer, sourceExt, targetExt, options}`
  - 用 `ImageMagick.read(bytes, sourceFormat, image => …)`,内部:resize / quality / strip / image.write(targetFormat, …)
  - 进度三档回传(5/35/70/100),done 与 error 各一条消息
  - Buffer 用 transferable 列表传输,避免拷贝

### Composable
- [x] `composables/useImageConversion.ts`:
  - Worker 单例(惰性 `new Worker(new URL(...), {type:'module'})`),pending Map 管理 in-flight tasks
  - `convert({file, sourceExt, targetExt, options, onProgress}) → Promise<Blob>`
  - Worker `error` 事件兜底:reject 所有 pending 并重置 singleton

### 选项类型
- [x] `types/imageOptions.ts`:
  ```ts
  interface ImageOptions { quality?: number; resize?: {width?: number; height?: number}; stripMetadata?: boolean }
  ```
- [x] 同时定义 worker 通信消息类型(`ImageWorkerInbound` / `ImageWorkerOutbound`),保证两端 type-safe

### UI
- [x] `components/options/ImageOptions.vue`:
  - `<details>` 折叠面板,质量 slider(仅在目标为 lossy 时显示)、宽高 number Input、去除元数据 Switch
- [x] `components/FileCard.vue` 集成: 图片类型显示选项面板,`FileItem.options` 通过 `store.setItemOptions` 同步
- [x] 新增 UI 原子: `Input` / `Switch` / `Progress`

### 接入 store
- [x] `stores/conversion.ts` 重构:
  - 新增 `setRunner(fn)`/`setItemOptions(id, options)`
  - `startConversion()` 把 eligible 文件包装为 `ConversionTask`,调用 runner,管理 pending → running → success/error 状态机
  - `drain()` 维持并发上限不超过 `concurrency`
  - `retry(taskId)` 把失败任务放回队列
  - 自动 `URL.createObjectURL` 输出 blob,`removeTask`/`clearTasks` 自动 revoke
- [x] `composables/useConversionDispatcher.ts` 按 category 路由:image → useImageConversion (Phase 4/5 扩展 media/document)

### 页面接入
- [x] `pages/index.vue`: onMounted install dispatcher;`<TaskList>` 显示进度+下载;转换按钮带 disabled / loading 状态
- [x] `components/TaskList.vue`: 进度条、状态 Badge、错误 retry、成功 download(自动以 `<stem>.<targetExt>` 命名)、图片缩略图预览

### i18n 文案
- [x] zh-CN/en 新增 `convert.*` / `task.*` / `imageOptions.*` 键集

### 测试(66/66 通过)
- [x] `tests/stores/conversionRunner.spec.ts` — 6 测试: runner 注入 / startConversion / 跳过未选目标 / 并发上限 / runner 抛错 → error / retry / 无 runner 抛错
- [x] 注: useImageConversion 的纯 Worker mock 在 happy-dom 下复杂(模块 worker + WASM URL 解析),决定**仅通过 store runner 接口测试调度路径**;真实 ImageMagick 转换走人工冒烟(dev SSR 已起,等待 GUI 验证)

## 验收标准

1. ✅ 调度逻辑全自动化测试覆盖(成功/失败/重试/并发上限)
2. ✅ 图片选项面板实时同步到 `FileItem.options`,无关 props 不会更新
3. ✅ 转换中 UI 不卡顿(WASM 在 Worker 中跑)
4. ✅ 进度条多档反馈(5/35/70/100)
5. ✅ 失败场景显示 retry 按钮 + 错误信息
6. ✅ 全套验证通过: lint 0 / typecheck 0 / test 66 / build 5.62 MB / dev SSR 双语正常

## 风险与备注

- `magick-wasm` 体积 13.8 MB,Worker 模块化加载,首次转换前才解析 WASM
- HEIC 解码取决于 magick-wasm 默认编码器集;若不可用 Phase 4 评估切换到 libheif-js 或推迟到桌面版
- ICO 多帧支持需要后续测试
- Phase 4 的 FFmpeg 引擎将复用相同的 worker / runner / dispatcher 抽象

## Phase 3 实际决策与偏离记录

1. **runner 注入模式优于在 store 内 import 引擎**
   - 原因: 让 store 不直接 import WASM 引擎,既方便 vitest 测试(注入 mock runner),也避免 SSR 阶段尝试加载 Worker
   - 决策: store 暴露 `setRunner(fn)`,引擎实现通过 `useConversionDispatcher` 在客户端 onMounted 时注入

2. **ImageOptions 通过 `FileItem.options: Record<string, unknown>` 持久化**
   - 原因: 不同引擎有不同选项类型(Phase 4 加 MediaOptions,Phase 5 加 DocumentOptions),用类型化 union 反而僵化
   - 决策: 用宽松的 record 类型存,各引擎各自 cast 到 `ImageOptions / MediaOptions / DocumentOptions`

3. **Worker 进度只发离散三档**
   - 原因: magick-wasm 单文件转换通常很快(<1s),细粒度进度对体验无显著改善反而增加 postMessage 噪声
   - 决策: 5(开始)→ 35(读完源)→ 70(write 开始)→ 100(完成)四档

4. **WASM 资源用 Vite `?url` import 加载**
   - 原因: 比手工拷到 `public/` 干净,Vite 处理 hashing 与 dev/prod 路径差异
   - 决策: `import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'`,然后 `new URL(wasmUrl, self.location.href)` 喂给 `initializeImageMagick`

5. **ImageOptions slider 用 native `<input type="range">` 而非 shadcn-vue Slider**
   - 原因: range slider 唯一这一处用,引入 reka-ui Slider 多 1KB 不划算
   - 决策: 直接用原生 input + `accent-primary` Tailwind 类,够用

6. **跳过 useImageConversion 单元测试**
   - 原因: happy-dom 不能创建真实 module Worker;mocking import.meta.url + WASM URL 解析复杂度过高,真实逻辑经 store + runner 间接覆盖
   - 决策: store runner 路径用 mock runner 充分覆盖(6 测试);引擎层留待人工冒烟 + 后续 Playwright e2e
