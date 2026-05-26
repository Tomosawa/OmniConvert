import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ConversionTask } from '@/types/conversion'
import type { DetectedFile, FileItem } from '@/types/file'
import { uid } from '@/utils/fileSize'

/**
 * Conversion store — single source of truth for both staged file items
 * (uploaded but not yet converted) and conversion tasks.
 *
 * Phase 2 introduces the file-item layer; Phase 6 will fully wire task
 * execution (engine dispatch, concurrency, cancellation). The two layers
 * coexist on purpose: a file may sit in `items` indefinitely while the
 * user picks a target format, and only when they hit "convert" does it
 * become a task.
 */
export const useConversionStore = defineStore('conversion', () => {
  const items = ref<FileItem[]>([])
  const tasks = ref<ConversionTask[]>([])
  const concurrency = ref(2)

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

  function clearItems(): void {
    items.value = []
  }

  // -- tasks (full execution wired in Phase 6) ------------------------------

  const pending = computed(() => tasks.value.filter((t) => t.status === 'pending'))
  const running = computed(() => tasks.value.filter((t) => t.status === 'running'))
  const completed = computed(() => tasks.value.filter((t) => t.status === 'success'))
  const failed = computed(() => tasks.value.filter((t) => t.status === 'error'))

  const total = computed(() => tasks.value.length)
  const successCount = computed(() => completed.value.length)
  const errorCount = computed(() => failed.value.length)

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

  return {
    // state
    items,
    tasks,
    concurrency,

    // file-item ops
    addDetected,
    removeItem,
    setTargetFormat,
    clearItems,

    // task ops
    pending,
    running,
    completed,
    failed,
    total,
    successCount,
    errorCount,
    addTask,
    removeTask,
    clearTasks,
    clearAll,
    setConcurrency,
  }
})
