# Phase 3 — ImageMagick 图片引擎

> 预估 3 天 · 前置: Phase 2 · 输出: 图片格式互转 + 高级选项

## 目标

接入 `@imagemagick/magick-wasm`,在 Web Worker 中运行,实现常见图片格式互转 (JPG / PNG / WebP / GIF / BMP / ICO / TIFF / HEIC),提供质量、尺寸等高级选项。

## Checklist

### 依赖
- [ ] `pnpm add @imagemagick/magick-wasm`
- [ ] 配置 Vite 处理 WASM 资源(可能需要在 `nuxt.config.ts` 中 `vite.optimizeDeps.exclude`)

### Worker
- [ ] `workers/imageMagickWorker.ts`:
  - `initialize()` 加载 WASM(只一次)
  - 监听 `message`: `{ type: 'convert', id, buffer, sourceFormat, targetFormat, options }`
  - 用 `ImageMagick.read(buffer)` → `image.format = MagickFormat[targetFormat]` → `image.write(buf => ...)`
  - 进度通过中间 `progress` 消息回传
  - 错误捕获 → `{ type: 'error', id, message }`

### Composable
- [ ] `composables/useImageConversion.ts`:
  - 内部维护 Worker 单例(惰性创建)
  - 暴露 `{ convert(file, targetFormat, options): Promise<Blob>, isReady, error }`
  - 进度通过回调或 `ref` 同步出去

### 选项类型
- [ ] `types/imageOptions.ts`:
  ```ts
  interface ImageOptions {
    quality?: number          // 0-100, JPG/WebP
    resize?: { width?: number; height?: number; mode: 'fit' | 'fill' | 'cover' }
    compressLevel?: number    // 0-9, PNG
    stripMetadata?: boolean
  }
  ```

### UI
- [ ] `components/options/ImageOptions.vue` 高级选项折叠面板
- [ ] `components/FileCard.vue` 集成: 图片类型显示该选项面板

### 接入 store
- [ ] `stores/conversion.ts` 中 `runTask(taskId)` 在图片场景调用 `useImageConversion().convert(...)`

### 测试
- [ ] `tests/composables/useImageConversion.spec.ts`(用 happy-dom + Worker mock 验证 API 正确性)
- [ ] 手工测试: JPG → PNG / WebP, PNG → JPG, 质量参数实际生效

## 验收标准

1. 上传 JPG → 选 PNG → 转换 → 下载,文件可正常打开
2. 质量参数从 100 → 50,文件体积明显缩小
3. 尺寸缩放参数生效
4. 转换中 UI 不卡顿(Worker 运转)
5. 进度条至少有 0/50/100 三档反馈
6. 失败场景(损坏文件)显示错误提示,Worker 不崩

## 风险与备注

- `magick-wasm` 体积较大(~10MB),需确认懒加载(只在用户上传图片时初始化 Worker)
- HEIC 解码需要额外编码器,默认包可能不含,需评估是否切换到 [libheif-js]
- ICO 多帧支持需测试
- Vite 构建时 WASM 资源处理: 可能需要 `assetsInclude: ['**/*.wasm']` 或在 nuxt.config 中添加 nitro public 资源
