# Phase 2 — 文件上传与格式检测

> 预估 2 天 · 前置: Phase 1 · 输出: 拖拽上传 + 格式识别 + 文件卡片

## 目标

用户能拖拽或点击上传一个或多个文件,系统自动识别格式(扩展名 + Magic Number 双重验证),展示文件卡片,并推荐合理的目标格式。

## Checklist

### Composables
- [ ] `composables/useDropZone.ts`:
  - 入参: `target: Ref<HTMLElement>`、`options: { multiple, accept }`
  - 出参: `{ isOver, isDragging, files, reset }`
  - 基于原生 `dragenter` / `dragover` / `drop` / `dragleave`,无外部依赖
- [ ] `composables/useFileDetection.ts`:
  - 入参: `File`
  - 出参: `Promise<DetectedFile>` 含 `category: 'image' | 'media' | 'document' | 'unknown'`、`mime`、`ext`、`magicMatch: boolean`
  - 实现: 扩展名表 + 文件头读取(前 16 字节)
- [ ] `composables/useFormatRecommend.ts`:
  - 入参: `DetectedFile`
  - 出参: `string[]` 推荐目标格式(按使用频率排序)
  - 纯函数,易测

### 类型
- [ ] `types/file.ts`:
  ```ts
  type FileCategory = 'image' | 'media' | 'document' | 'unknown'
  interface DetectedFile { file: File; category: FileCategory; mime: string; ext: string; magicMatch: boolean }
  interface FileItem { id: string; detected: DetectedFile; targetFormat: string | null }
  ```

### 工具
- [ ] `utils/magicNumber.ts` 常用文件签名表(JPG/PNG/GIF/PDF/MP4/MP3/...)
- [ ] `utils/formatTable.ts` 格式映射表 + 推荐表(三引擎覆盖范围)
- [ ] `utils/fileSize.ts` 字节转 KB/MB/GB

### 组件
- [ ] `components/UploadDropzone.vue`(可拖拽 + 点击 + 多选;空态/拖拽中/文件已添加 三态视觉)
- [ ] `components/FileCard.vue`:
  - 缩略图(图片直接 ObjectURL,音视频用图标,文档用图标)
  - 文件名 + 大小 + 检测格式徽章
  - 目标格式 Select(选项来自 `useFormatRecommend`)
  - 移除按钮
- [ ] `components/FileList.vue` 卡片列表容器
- [ ] `components/LargeFileWarning.vue` 大于阈值时弹出"建议使用桌面版"提示

### 大文件提示
- 阈值由 `runtimeConfig.public.largeFileThreshold` 控制,默认 500MB
- 在卡片上展示警告徽章,点击打开 `LargeFileWarning` Dialog

### Pinia 接入
- [ ] `stores/conversion.ts` 增加 `addFiles(files: File[])` / `removeFile(id)` / `setTargetFormat(id, format)` actions

### 测试
- [ ] `tests/composables/useFileDetection.spec.ts` (模拟 File + ArrayBuffer)
- [ ] `tests/composables/useFormatRecommend.spec.ts` (各 category 推荐覆盖)
- [ ] `tests/utils/magicNumber.spec.ts`
- [ ] `tests/components/FileCard.spec.ts`(渲染 + 选目标格式 emit)

## 验收标准

1. 拖拽 5 个不同类型文件(jpg / png / mp4 / mp3 / docx),全部正确识别
2. 改后缀但内容不符的文件,Magic Number 校验失败并标红
3. 选不同目标格式时,卡片状态正确更新
4. >500MB 文件出现警告
5. `pnpm test` 全部通过

## 风险与备注

- HEIC、SVG、WebP 等"灰区"格式的 Magic Number 需仔细验证
- 一次性拖入大量文件(如 100+)可能造成 UI 卡顿,考虑虚拟列表(可先用普通列表,Phase 6 优化)
- Magic Number 表参考 [file-signatures](https://en.wikipedia.org/wiki/List_of_file_signatures)
