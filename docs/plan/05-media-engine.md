# Phase 4 — FFmpeg 音视频引擎

> 预估 3 天 · 前置: Phase 3 · 输出: 音视频格式互转 + 编码参数

## 目标

接入 `@ffmpeg/ffmpeg`,在 Web Worker 中运行,实现音频(MP3 / WAV / AAC / FLAC / OGG)与视频(MP4 / WebM / MOV / MKV / AVI)互转,带比特率/编码器/分辨率/帧率/采样率参数。

## Checklist

### COOP/COEP 头(SharedArrayBuffer 必需)
- [ ] `nuxt.config.ts` 配置:
  ```ts
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  },
  ```
- [ ] 验证: 浏览器控制台 `crossOriginIsolated` 返回 `true`

### 依赖
- [ ] `pnpm add @ffmpeg/ffmpeg @ffmpeg/util`
- [ ] FFmpeg core 资源放 `public/ffmpeg/` 或走 unpkg CDN(注意 CORS)

### Worker
- [ ] `workers/ffmpegWorker.ts`:
  - 加载 `@ffmpeg/ffmpeg` 单例
  - `convert(buffer, sourceFormat, targetFormat, options)`:
    - `ffmpeg.writeFile('input.<src>', new Uint8Array(buffer))`
    - 拼参数: `-i input.<src> [...options] output.<tgt>`
    - 监听 `progress` 事件,回传主线程
  - 错误处理 + 内存释放(`deleteFile`)

### Composable
- [ ] `composables/useMediaConversion.ts`(同 image 风格)

### 选项
- [ ] `types/mediaOptions.ts`:
  ```ts
  interface MediaOptions {
    audioBitrate?: string     // '128k' | '192k' | '320k'
    videoBitrate?: string     // '1M' | '2M' | '5M'
    audioCodec?: string
    videoCodec?: string
    resolution?: { width: number; height: number }
    fps?: number
    sampleRate?: number       // 44100 | 48000
  }
  ```
- [ ] `components/options/MediaOptions.vue`(分音/视频两个 Tab)

### 大文件提示
- [ ] 文件 > 500MB 时禁用并提示"使用桌面版";由 Phase 2 的 `LargeFileWarning` 复用

### 测试
- [ ] `tests/composables/useMediaConversion.spec.ts`(API 形态验证)
- [ ] 手工测试矩阵:
  - MP4 → MP3(提取音轨)
  - MP4 → WebM(转码)
  - WAV → MP3(压缩)
  - MOV → MP4(容器替换)

## 验收标准

1. MP4 → MP3 成功,音轨完整
2. MP4 → WebM 成功,视频可播放
3. 进度条实时更新(0 → 100%)
4. 比特率参数生效(用 320k 与 64k 对比文件大小)
5. 错误场景(不支持的编码器组合)显示清晰错误
6. 转换中页面其他交互不卡

## 风险与备注

- `@ffmpeg/ffmpeg` 0.12+ 已基于 mt(多线程),依赖 SharedArrayBuffer,COOP/COEP 必须配
- core 资源 ~30MB,务必懒加载;首次转换前显示 Loading UI
- AVI / MKV 等容器在 ffmpeg-wasm 中部分编码器可能缺失,需在格式表里精细标注哪些组合可用
- Vercel 静态部署 + COOP/COEP 头通过 `vercel.json` 的 `headers` 配置(Phase 9 同步)
- 本地 dev 时 `nuxi dev` 对 routeRules 的 headers 是否生效需确认,必要时改用 `vite-plugin-cross-origin-isolation`
