# Phase 8 — Tauri 桌面端

> 前置: Phase 6 · 输出: Win/macOS/Linux 三平台桌面应用

## 目标

把 Web 项目用 Tauri 2.0 封装为桌面应用,通过 Sidecar 调用原生 CLI(ImageMagick / FFmpeg / Pandoc),发挥原生性能、多线程、突破 WASM 内存限制。

## 页面适配
页面内容参考 Web 版本，首页介绍和客户端下载界面什么的不需要，打开就是选择文件界面。
在操作逻辑上，页面布局上，需要适合客户端的操作。

## Checklist

### Tauri 初始化
- [ ] `pnpm add -D @tauri-apps/cli`
- [ ] `pnpm tauri init`(Tauri 2.0)
  - 应用名: OmniConvert
  - 窗口标题: OmniConvert
  - frontendDist: `.output/public` 或 `dist/`(SSG 产物)
  - devUrl: `http://localhost:3000`
  - beforeDevCommand: `pnpm dev`
  - beforeBuildCommand: `pnpm generate`

### Sidecar 二进制准备
- [ ] 三平台 CLI 二进制收集到 `src-tauri/binaries/`:
  - `imagemagick-x86_64-apple-darwin` / `imagemagick-aarch64-apple-darwin` / `imagemagick-x86_64-pc-windows-msvc.exe` / `imagemagick-x86_64-unknown-linux-gnu`
  - 对 ffmpeg / pandoc 同样命名规范
- [ ] `tauri.conf.json` 中 `bundle.externalBin` 指向上述路径(去掉平台后缀,Tauri 自动加)

### 平台分流
- [ ] `composables/usePlatform.ts`:
  ```ts
  export const usePlatform = () => {
    const isDesktop = computed(() => typeof (window as any).__TAURI_INTERNALS__ !== 'undefined')
    return { isDesktop }
  }
  ```
- [ ] 引擎 composable 内策略模式:
  ```ts
  const { isDesktop } = usePlatform()
  return isDesktop.value
    ? convertViaSidecar(...)
    : convertViaWasm(...)
  ```

### Sidecar 调用
- [ ] `composables/useSidecar.ts` 包装 `@tauri-apps/plugin-shell` 的 `Command.sidecar(...)`
- [ ] 进度解析: 监听 stdout / stderr,正则匹配 ffmpeg/pandoc 的进度行
- [ ] 临时文件: 用 Tauri 的 `path.tempDir()` + `fs.writeFile`/`removeFile`

### Tauri 权限白名单
- [ ] `tauri.conf.json` 中 `permissions`:
  - `core:default`
  - `shell:allow-execute`(Sidecar)
  - `fs:allow-read-text-file` / `fs:allow-write-binary-file`(临时文件)
  - `dialog:allow-open` / `dialog:allow-save`(原生文件选择)
- [ ] CSP 配置允许 WASM(回退场景)

### PDF 补齐(Phase 5 留下的坑)
- [ ] 桌面版 Pandoc CLI 配合 LaTeX 实现完整 PDF 输出
- [ ] LaTeX的二进制看最好可以融入到安装包里软件里，免得用户还需要去单独下载很麻烦体验差，或者实现不了的话，还有啥其他的方式实现Pdf都可以考虑。

### 原生增强
- [ ] 拖文件到 Dock/任务栏图标可打开(`tauri.conf.json` 的 `app.windows.fileDropEnabled`)
- [ ] 系统通知(转换完成):`@tauri-apps/plugin-notification`
- [ ] 自动更新(可推迟):`tauri-plugin-updater`

### 构建产物
- [ ] macOS: `.dmg`(同时支持 Intel + Apple Silicon)
- [ ] Windows: `.msi` 或 NSIS `.exe`
- [ ] Linux: `.deb` + `.AppImage`
- [ ] 代码签名:macOS 可推迟到正式发布前(开发者证书);Windows 同理

### 测试
- [ ] macOS 本地 `pnpm tauri dev` 跑通端到端转换
- [ ] Windows / Linux 用 GitHub Actions 跑构建(Phase 9)

## 验收标准

1. macOS 本地能 `pnpm tauri dev` 启动且完成图片/视频/文档三类转换
2. macOS `pnpm tauri build` 产出 `.dmg`,双击可安装运行
3. Sidecar 路径下大文件(>1GB 视频)能正常转换
4. PDF 输出在桌面端可用
5. 文件大小限制提示在桌面端**不显示**

## 风险与备注

- 三平台 CLI 二进制总体积可能 ~200MB,影响下载体验。备选: 安装时引导用户下载或用系统已装的二进制(检测 PATH)
- macOS 公证(notarization)开发期可跳过,正式发布前要做
- Tauri 2.0 的 plugin 体系与 1.x 差异较大,确保用最新文档
- Sidecar 调用的进度解析需对每个 CLI 做适配(ffmpeg 的 `time=` 行、pandoc 几乎无进度可解析)
