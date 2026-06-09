# OmniConvert 桌面端修复与增强设计

**日期**: 2026-06-09
**平台**: macOS 优先
**方案**: 方案 A — 最小修复 + 增强参数

## 1. 核心问题

桌面端（Tauri）选择文件后转换引擎报告"找不到输入文件"。

### 根因

三个 desktop composable（`useDesktopImageConversion`、`useDesktopMediaConversion`、`useDesktopDocumentConversion`）均使用以下模式写入临时文件：

```typescript
const tmpBase = await path.tempDir()
const inputPath = await path.join(tmpBase, `${id}_input.${sourceExt}`)
await fs.writeFile(inputPath, inputBuf)  // ❌ 无 baseDir，绝对路径解析不稳定
```

Tauri 2.0 的 `@tauri-apps/plugin-fs` `writeFile(path, data, options)` 在**未指定 `baseDir`** 时对绝对路径的解析行为不可靠。Sidecar 作为原生进程接收到的绝对路径可能与 FS 插件实际写入的路径不一致。

### 修复策略

所有 FS 操作显式指定 `{ baseDir: BaseDirectory.Temp }`，`path` 参数使用**相对文件名**（不含目录前缀），确保 FS 插件将文件写入正确的 `$TEMP` 解析目录。Sidecar CLI 参数继续使用绝对路径（`path.join(await tempDir(), fileName)`）。

## 2. 修复清单

### 2.1 `useDesktopImageConversion.ts`

| 变更 | 说明 |
|------|------|
| 引入 `BaseDirectory` | `import { BaseDirectory } from '@tauri-apps/plugin-fs'` |
| 文件名改为相对路径 | `inputFileName = `${id}_input.${sourceExt}``（不含 tmpBase 前缀） |
| `fs.writeFile` | `fs.writeFile(inputFileName, inputBuf, { baseDir: BaseDirectory.Temp })` |
| `fs.exists` | `fs.exists(inputFileName, { baseDir: BaseDirectory.Temp })` |
| `fs.readFile` | `fs.readFile(outputFileName, { baseDir: BaseDirectory.Temp })` |
| `fs.remove` | `fs.remove(inputFileName/outputFileName, { baseDir: BaseDirectory.Temp })` |
| Sidecar args | 继续使用绝对路径 `inputPath/outputPath`（通过 `path.join(await tempDir(), fileName)` 构造） |
| 写入验证 | 在 sidecar 运行前 `fs.exists` 检查输入文件是否真正写入 |

### 2.2 `useDesktopMediaConversion.ts`

同上模式。额外注意 `buildFfmpegArgs` 的 `inputName/outputName` 参数改为接收绝对路径（由 `path.join` 构造），不依赖 FS 操作的相对路径。

### 2.3 `useDesktopDocumentConversion.ts`

同上模式。注意 pandoc 的 `buildCliArgs` 和 `buildPandocOptions` 中的 `inputFile/outputFile` 参数也需要用绝对路径。

### 2.4 `useSidecar.ts`

增强错误诊断：

- sidecar 返回 `code !== 0` 时，扫描 stderr 中的关键字（`No such file`、`cannot open`、`Permission denied`）
- 如果匹配，附加 `inputPath` 信息到错误消息，便于定位
- 不改变 `run` 函数的返回类型和签名

## 3. 桌面端性能增强

### 3.1 多线程解锁

当前 `buildFfmpegArgs` 在 `!ctx.desktop` 时强制 `-threads 1`，桌面端分支无此限制但也没有主动优化。

改进：桌面端添加 `-threads 0`（让 ffmpeg 根据CPU核心数自动分配线程数）。

```typescript
// 在 buildFfmpegArgs 中
if (ctx.desktop) {
  args.push('-threads', '0')  // auto — 利用多核
}
```

插入位置：在 `-i inputName -y` 之后、视频/音频编码参数之前。

### 3.2 H.265 多线程参数

当前 H.265 的 `x265-params` 仅在 Web 版有单线程限制。桌面版需要独立的参数：

```typescript
if (vcodec === 'libx265') {
  if (ctx.desktop) {
    args.push('-x265-params', 'log-level=warning')
  } else {
    args.push('-x265-params', 'log-level=warning:frame-threads=1:wpp=0:pools=none')
  }
}
```

位置：在视频编码选择之后、CRF/bitrate 参数之前。

## 4. 兼容性保障

所有改动遵守隔离原则：

- **Desktop composable** (`useDesktop*.ts`) — 独立修改，Web 版不导入这些文件
- **`ffmpegArgs.ts`** — 仅修改 `ctx.desktop` 相关分支，`!ctx.desktop` 逻辑不动
- **`useSidecar.ts`** — 惰性导入 Tauri 模块，Web 端 `isDesktop === false` 时 dispatcher 不调用 sidecar
- **`useConversionDispatcher.ts`** — 不改动
- **`capabilities/default.json`** — 不改动，`$TEMP/**` scope 足够

## 5. 不做的事（YAGNI）

- ❌ 不引入 Rust 端命令（后续可演进到方案 B）
- ❌ 不改 FS 权限 scope
- ❌ 不实现大文件流式写入（方案 C）
- ❌ 不修改 Web 版 WASM 引擎逻辑
- ❌ 不修改 dispatcher 的分流逻辑

## 6. 测试策略

- 手动测试：在 macOS 上运行 `tauri dev`，选择图片/音频/视频/文档文件进行转换
- 验证场景：图片→PNG/JPG/WEBP，音频→MP3/WAV/AAC/FLAC，视频→MP4/MKV/H.265，文档→MD→HTML/DOCX
- 验证项：引擎能找到输入文件、转换成功、输出文件正确、临时文件清理
- 不影响 Web 版：运行 `pnpm dev`（Web 模式），确认所有 Web 版功能正常