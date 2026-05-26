import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ConversionTask } from '@/types/conversion'
import type { DetectedFile, FileItem } from '@/types/file'
import { uid } from '@/utils/fileSize'

/**
 * Conversion store — single source of truth for both staged file items
 * (uploaded but not yet converted) and conversion tasks.
 *
 * Phase 3 wires the store to engine dispatch via `runner` injection: a
 * page or composable injects the actual convert function via `setRunner`,
 * keeping the store free of WASM imports (handy for tests).
 */
export type ConversionRunner = (
  task: ConversionTask,
  onProgress: (n: number) => void,
) => Promise<{ blob: Blob }>

export const useConversionStore = defineStore('conversion', () => {
  const items = ref<FileItem[]>([])
  const tasks = ref<ConversionTask[]>([])
  const concurrency = ref(2)

  let runner: ConversionRunner | null = null

  // -- runner injection ------------------------------------------------------

  function setRunner(fn: ConversionRunner | null): void {
    runner = fn
  }

  // -- file items ------------------------------------------------------------

  function addDetected(detected: DetectedFile): FileItem {
    const item: FileItem = {
      id: uid('file'),
      detected,
      targetFormat: null,
    }
    items.value.push(item)
    return item
  }

  function removeItem(id: string): void {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value.splice(idx, 1)
  }

  function setTargetFormat(id: string, format: string | null): void {
    const item = items.value.find((i) => i.id === id)
    if (item) item.targetFormat = format
  }

  function setItemOptions(id: string, options: Record<string, unknown>): void {
    const item = items.value.find((i) => i.id === id)
    if (item) item.options = options
  }

  function clearItems(): void {
    items.value = []
  }

  // -- tasks -----------------------------------------------------------------

  const pending = computed(() => tasks.value.filter((t) => t.status === 'pending'))
  const running = computed(() => tasks.value.filter((t) => t.status === 'running'))
  const completed = computed(() => tasks.value.filter((t) => t.status === 'success'))
  const failed = computed(() => tasks.value.filter((t) => t.status === 'error'))

  const total = computed(() => tasks.value.length)
  const successCount = computed(() => completed.value.length)
  const errorCount = computed(() => failed.value.length)
  const isAnyRunning = computed(() => running.value.length > 0 || pending.value.length > 0)

  function addTask(task: ConversionTask): void {
    tasks.value.push(task)
  }

  function removeTask(id: string): void {
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const task = tasks.value[idx]
    if (task?.resultUrl) URL.revokeObjectURL(task.resultUrl)
    tasks.value.splice(idx, 1)
  }

  function clearTasks(): void {
    for (const t of tasks.value) {
      if (t.resultUrl) URL.revokeObjectURL(t.resultUrl)
    }
    tasks.value = []
  }

  function clearAll(): void {
    clearItems()
    clearTasks()
  }

  function setConcurrency(n: number): void {
    concurrency.value = Math.max(1, Math.min(8, Math.floor(n)))
  }

  // -- task execution -------------------------------------------------------

  /**
   * Build conversion tasks from all currently-staged file items that have a
   * target format selected, and immediately run them through the injected
   * runner (subject to `concurrency`).
   */
  async function startConversion(): Promise<void> {
    if (!runner) throw new Error('Conversion runner not configured')

    const eligible = items.value.filter(
      (item) => item.targetFormat && item.detected.category !== 'unknown',
    )
    if (eligible.length === 0) return

    for (const item of eligible) {
      const target = item.targetFormat
      if (!target) continue
      const task: ConversionTask = {
        id: uid('task'),
        fileItem: item,
        targetFormat: target,
        status: 'pending',
        progress: 0,
      }
      tasks.value.push(task)
    }

    await drain()
  }

  async function drain(): Promise<void> {
    if (!runner) return
    while (running.value.length < concurrency.value && pending.value[0]) {
      const task = pending.value[0]
      if (!task) break
      void runOne(task)
    }
  }

  async function runOne(task: ConversionTask): Promise<void> {
    const fn = runner
    if (!fn) return
    task.status = 'running'
    task.startedAt = Date.now()
    task.progress = 0
    try {
      const { blob } = await fn(task, (n) => {
        task.progress = Math.max(task.progress, Math.min(100, Math.round(n)))
      })
      task.resultBlob = blob
      task.resultUrl = URL.createObjectURL(blob)
      task.progress = 100
      task.status = 'success'
      task.completedAt = Date.now()
    } catch (err) {
      task.status = 'error'
      task.error = err instanceof Error ? err.message : String(err)
      task.completedAt = Date.now()
    } finally {
      void drain()
    }
  }

  function retry(taskId: string): void {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task || task.status !== 'error') return
    task.status = 'pending'
    task.error = undefined
    task.progress = 0
    void drain()
  }

  return {
    // state
    items,
    tasks,
    concurrency,

    // runner
    setRunner,

    // file-item ops
    addDetected,
    removeItem,
    setTargetFormat,
    setItemOptions,
    clearItems,

    // task ops
    pending,
    running,
    completed,
    failed,
    total,
    successCount,
    errorCount,
    isAnyRunning,
    addTask,
    removeTask,
    clearTasks,
    clearAll,
    setConcurrency,
    startConversion,
    retry,
  }
})
