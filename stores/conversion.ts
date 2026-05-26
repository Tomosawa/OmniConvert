import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ConversionTask } from '@/types/conversion'

/**
 * Conversion task store — Phase 1 ships the *shape* and a few helpers so
 * downstream UI work can wire up against a stable surface. Full execution
 * (engine dispatch, concurrency, cancellation, persistence) lands in Phase 6.
 *
 * Callers should treat the store as the single source of truth for tasks;
 * direct mutation of `tasks` from outside is intentionally discouraged.
 */
export const useConversionStore = defineStore('conversion', () => {
  const tasks = ref<ConversionTask[]>([])
  const concurrency = ref(2)

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

  function clearAll(): void {
    for (const t of tasks.value) {
      if (t.resultUrl) URL.revokeObjectURL(t.resultUrl)
    }
    tasks.value = []
  }

  function setConcurrency(n: number): void {
    concurrency.value = Math.max(1, Math.min(8, Math.floor(n)))
  }

  return {
    tasks,
    concurrency,
    pending,
    running,
    completed,
    failed,
    total,
    successCount,
    errorCount,
    addTask,
    removeTask,
    clearAll,
    setConcurrency,
  }
})
