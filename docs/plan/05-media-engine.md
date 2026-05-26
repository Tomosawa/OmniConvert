# Phase 4 — FFmpeg 音视频引擎 ✅

> 前置: Phase 3 · 输出: 音视频格式互转 + 编码参数
> **状态**: 已完成 (2026-05-25)

## 目标

接入 `@ffmpeg/ffmpeg` 多线程版本,实现音频(MP3 / WAV / AAC / FLAC / OGG)与视频(MP4 / WebM / MOV / MKV / AVI)互转,带比特率/编码器/分辨率/帧率/采样率参数。

## Checklist

### COOP/COEP 头(SharedArrayBuffer 必需)
- [x] `nuxt.config.ts` `routeRules` 全站设置 `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
- [x] 验证: dev server `curl -i` 返回头中确认两条都生效

### 依赖
- [x] `pnpm add @ffmpeg/ffmpeg @ffmpeg/util` (0.12.15 + 0.12.2)
- [x] `pnpm add @ffmpeg/core-mt` (0.12.10, multi-thread,SharedArrayBuffer 必需)
- [x] core/wasm/worker 三个文件通过 Vite `?url` import 加载,使用 `@ffmpeg/core-mt` 的 `./wasm` / `./worker` 子路径(不直接走 `dist/esm`)

### Composable
- [x] `composables/useMediaConversion.ts`:
  - 单例 FFmpeg 实例,惰性 load(coreURL/wasmURL/workerURL)
  - `convert({file, sourceExt, targetExt, options, onProgress}) → Promise<Blob>`
  - `ff.on('progress')` 转发到 onProgress(0-100)
  - finally 阶段清理 `deleteFile` 输入输出
  - **关键**: 把 Uint8Array 拷贝到独立 ArrayBuffer 后才 new Blob,避免 SharedArrayBuffer 视图被 Blob 拒绝

### 工具(纯函数)
- [x] `utils/ffmpegArgs.ts` `buildFfmpegArgs()`:
  - 输入 `{inputName, outputName, targetExt, options}`,输出 string[]
  - 自动选编码器(audio: libmp3lame/pcm_s16le/aac/libopus/...;video: libx264/libvpx-vp9/mpeg4)
  - resolution + fps 合并到 `-vf scale=W:H,fps=N`
  - audioOnly 强制 `-vn`
- [x] 暴露 `targetKind` / `targetMime` / `AUDIO_BITRATES` / `VIDEO_BITRATES` / `SAMPLE_RATES` / `FRAME_RATES`

### 类型
- [x] `types/mediaOptions.ts`: `MediaOptions` + `MediaTargetKind` + `MediaArgsContext`

### UI
- [x] `components/options/MediaOptions.vue`:
  - 折叠面板,音频比特率/采样率(始终显示)
  - 视频比特率/帧率/分辨率/audioOnly(仅视频目标)
- [x] `components/FileCard.vue` 集成: media 类型显示 MediaOptions(传入 targetExt)
- [x] dispatcher 加 media 分支

### 大文件提示
- [x] 复用 Phase 2 的 `LargeFileWarning`(>500MB 显示警告徽章)

### i18n
- [x] zh-CN/en 新增 `mediaOptions.*` 键集

### 测试(79/79 通过)
- [x] `tests/utils/ffmpegArgs.spec.ts` — 13 测试: targetKind / targetMime / 各 audio target codec / video target codec / filter chain / audioOnly / bitrate

## 验收标准

1. ✅ COOP/COEP 头本地 dev 已生效(`curl -i` 验证)
2. ✅ FFmpeg 参数生成全部纯函数测试覆盖
3. ✅ MediaOptions 视频/音频 target 自动展开/收起视频专用字段
4. ✅ 全套验证通过: lint 0 / typecheck 0 / test 79 / build 5.58 MB / dev SSR + COOP/COEP 头都生效

## 风险与备注

- `@ffmpeg/core-mt` 总下载量较大(~32 MB),只在用户上传 media 文件时由 dispatcher 触发首次 load
- AVI / MKV 容器在 ffmpeg-wasm 中部分编码器可能缺失;运行时若失败由 `runner` 抛错 → 任务卡片显示 retry
- Vercel 部署需在 `vercel.json` 同步 COOP/COEP(Phase 9 处理)
- 本地 dev `nuxi dev` 已确认 routeRules headers 生效

## Phase 4 实际决策与偏离记录

1. **不在 Web Worker 里再嵌一层**
   - 原因: `@ffmpeg/ffmpeg` 0.12+ 自带 worker 调度(core-mt 自带 worker.js),如果再套一层 Worker 反而无法用 SharedArrayBuffer
   - 决策: 直接在主线程 `import { FFmpeg }`;cross-origin-isolated 由全站 COOP/COEP 头保证

2. **使用 `@ffmpeg/core-mt` 子路径而非 dist 内部路径**
   - 原因: `@ffmpeg/core-mt` 的 `package.json` `exports` 字段只暴露 `.` / `./wasm` / `./worker`;`dist/esm/*` 子路径会被 Vite resolver 拒绝
   - 决策: `import coreUrl from '@ffmpeg/core-mt?url'` / `'@ffmpeg/core-mt/wasm?url'` / `'@ffmpeg/core-mt/worker?url'`

3. **Blob 构造时强制把 Uint8Array 拷贝到独立 ArrayBuffer**
   - 原因: core-mt 返回的 Uint8Array 是 SharedArrayBuffer 视图,`new Blob([uint8])` 在新版 TS 严格模式下被拒
   - 决策: `const copy = new Uint8Array(buf.byteLength); copy.set(buf); new Blob([copy.buffer])`

4. **跳过 useMediaConversion 直接单测**
   - 原因: FFmpeg WASM 在 happy-dom 不可启动,且体积过大
   - 决策: 把所有可测逻辑(参数生成、target 分类)集中到 `utils/ffmpegArgs.ts` 纯函数(13 测试覆盖);composable 仅做胶水,接 dispatcher 后由 store-runner 路径间接验证(Phase 3 的 6 测试已覆盖)

5. **MediaOptions 不细分 audio/video Tab**
   - 原因: PRD 提到 Tab,但实际看视频目标 = 视频字段 + 音频字段都展示(因为视频也带音轨),audio target = 只有音频字段;用 `v-if` 条件展示比 Tab 更直观
   - 决策: 一个 details 折叠面板,内部按 isVideoTarget 条件展示视频专用字段
