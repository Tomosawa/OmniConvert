# Phase 2 — 文件上传与格式检测 ✅

> 前置: Phase 1 · 输出: 拖拽上传 + 格式识别 + 文件卡片
> **状态**: 已完成 (2026-05-25)

## 目标

用户能拖拽或点击上传一个或多个文件,系统自动识别格式(扩展名 + Magic Number 双重验证),展示文件卡片,并推荐合理的目标格式。

## Checklist

### Composables
- [x] `composables/useDropZone.ts`:
  - 入参: `target: Ref<HTMLElement>`、`options: { multiple, accept, onFiles }`
  - 出参: `{ isOver, files, reset }`
  - 基于原生 `dragenter` / `dragover` / `drop` / `dragleave`,无外部依赖,depth counter 防 isOver flicker
- [x] `composables/useFileDetection.ts`:
  - 暴露 `detectFile(file)`(纯函数)与 `useFileDetection()` wrapper
  - 出参: `Promise<DetectedFile>` 含 `category`、`mime`、`ext`、`magicMatch`
  - 实现: 扩展名 + 文件头读取(前 64 字节)双重校验
- [x] `composables/useFormatRecommend.ts`:
  - 入参: `Ref<DetectedFile | null>`
  - 出参: `{ targets, defaultTarget }` 响应式
  - 自动剔除源格式自身

### 类型
- [x] `types/file.ts`: `FileCategory` / `DetectedFile` / `FileItem`(Phase 1 已写)

### 工具
- [x] `utils/magicNumber.ts` 21 条文件签名表 + `probeMagic()`(JPG/PNG/GIF/WebP/BMP/TIF/ICO/HEIC/MP3/WAV/FLAC/OGG/AAC/MP4/MOV/WebM/MKV/AVI/PDF/DOCX/EPUB)
- [x] `utils/formatTable.ts` 扩展名→类别映射 + 推荐目标格式表 + `normaliseExt`(jpeg→jpg / tiff→tif 等别名归一化)
- [x] `utils/fileSize.ts` `formatBytes` / `extensionOf` / `uid`

### 组件
- [x] `components/UploadDropzone.vue` 拖拽区域(空态/拖拽中/选择按钮 三态视觉,接 useDropZone)
- [x] `components/FileCard.vue` 文件卡片:缩略图(图片走 ObjectURL,其它图标)、文件名、大小、扩展名 Badge、类别 Badge、目标格式 Select、移除按钮、扩展名/魔数不匹配警告、未知格式警告、大文件警告
- [x] `components/FileList.vue` 列表容器,显示已选数量 + 一键清空
- [x] `components/LargeFileWarning.vue` Dialog 警告,展示文件大小 + 阈值,引导桌面版
- [x] shadcn-vue 新增组件: `Badge`、`Select`(全套)、`Dialog`(全套)

### 大文件提示
- [x] 阈值由 `runtimeConfig.public.largeFileThreshold` 控制,默认 500MB
- [x] FileCard 上展示 `<LargeFileWarning>` 包裹的警告 Badge,点击打开 Dialog

### Pinia 接入
- [x] `stores/conversion.ts` 新增 file-item 层: `items` state、`addDetected/removeItem/setTargetFormat/clearItems` actions;`clearAll` 同时清 items 与 tasks

### 首页接入
- [x] `pages/index.vue` 接入 `<UploadDropzone>` + `<FileList>`,处理函数批量调用 `detectFile` 并入 store

### 测试(60/60 通过)
- [x] `tests/utils/magicNumber.spec.ts` — 10 测试,覆盖 PNG/JPG/GIF/WebP/WAV/PDF/MP4/未知/短缓冲
- [x] `tests/utils/formatTable.spec.ts` — 12 测试,涵盖 normalise、category、recommend、表结构一致性
- [x] `tests/utils/fileSize.spec.ts` — 8 测试,formatBytes 各档位 / extensionOf / uid 唯一性
- [x] `tests/composables/useFileDetection.spec.ts` — 5 测试,真实 File 注入,涵盖正常 / 假扩展名 / 未知 / 文档兜底
- [x] `tests/composables/useFormatRecommend.spec.ts` — 4 测试,响应式切换、默认值、未知扩展
- [x] `tests/stores/conversion.spec.ts` 扩展 — 新增 4 测试覆盖 file-item 层 CRUD + clearAll 联动

## 验收标准

1. ✅ 拖拽 N 个不同类型文件,逐个卡片正确识别格式并提供推荐目标格式
2. ✅ Magic Number 检验失败的文件(扩展名与内容不符)在卡片上有警告标注
3. ✅ 选不同目标格式时,卡片状态正确更新,store 中 item 同步更新
4. ✅ >500MB 文件出现警告 Badge + Dialog
5. ✅ 全套验证通过: lint 0 / typecheck 0 / test 60 / build 5.54 MB / dev SSR 双语正常

## 风险与备注

- HEIC、SVG、WebP 等"灰区"格式的 Magic Number 需仔细验证
- 一次性拖入大量文件(如 100+)可能造成 UI 卡顿,考虑虚拟列表(可先用普通列表,Phase 6 优化)
- Magic Number 表参考 [file-signatures](https://en.wikipedia.org/wiki/List_of_file_signatures)

## Phase 2 实际决策与偏离记录

1. **`useFileDetection` 暴露纯函数 `detectFile` 优先于 composable wrapper**
   - 原因: 纯函数易测、易在非组件场景(如 store 调度)复用。`useFileDetection()` 仅做 wrapping,主接口对外是 `detectFile()`
   - 决策: 测试与首页页面都直接 import `detectFile`,wrapper 保留兼容 PRD 文档措辞

2. **MagicMatch 默认值策略调整**
   - 原因: 文档类(`.md`/`.txt`/`.html` 等)通常没有可识别的 magic number;若一律标 `magicMatch=false` UI 会误报警告
   - 决策: 当 magic 探测无命中且声明扩展名属于 `document` 类别时,认为 `magicMatch=true`;其他情况(unknown 或带 magic 的类别但探测失败)仍然 `false`

3. **shadcn-vue Select/Dialog/Badge 同样手工落地**
   - 原因: 与 Phase 1 一致,保留对组件的完全掌控
   - 决策: `components/ui/select`、`components/ui/dialog`、`components/ui/badge` 三个目录补齐对应原子组件

4. **Phase 2 不引入 Toast/Sonner**
   - 原因: 上传场景目前不需要弹通知(错误直接展示在卡片上即可)
   - 决策: 推迟到 Phase 6 任务执行阶段引入
