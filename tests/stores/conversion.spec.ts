import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionTask } from '@/types/conversion'

function makeTask(overrides: Partial<ConversionTask> = {}): ConversionTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    fileItem: {
      id: 'file-1',
      detected: {
        file: new File(['hello'], 'a.png', { type: 'image/png' }),
        category: 'image',
        mime: 'image/png',
        ext: 'png',
        magicMatch: true,
      },
      targetFormat: 'jpg',
    },
    targetFormat: 'jpg',
    status: 'pending',
    progress: 0,
    ...overrides,
  }
}

describe('stores/conversion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useConversionStore()
    expect(store.total).toBe(0)
    expect(store.pending).toEqual([])
  })

  it('adds tasks and surfaces them in pending', () => {
    const store = useConversionStore()
    store.addTask(makeTask({ id: 't1' }))
    store.addTask(makeTask({ id: 't2', status: 'success' }))

    expect(store.total).toBe(2)
    expect(store.pending.map((t) => t.id)).toEqual(['t1'])
    expect(store.successCount).toBe(1)
  })

  it('removes a task by id', () => {
    const store = useConversionStore()
    store.addTask(makeTask({ id: 't1' }))
    store.addTask(makeTask({ id: 't2' }))

    store.removeTask('t1')
    expect(store.total).toBe(1)
    expect(store.tasks[0]?.id).toBe('t2')
  })

  it('clamps concurrency between 1 and 8', () => {
    const store = useConversionStore()
    store.setConcurrency(0)
    expect(store.concurrency).toBe(1)
    store.setConcurrency(99)
    expect(store.concurrency).toBe(8)
    store.setConcurrency(3)
    expect(store.concurrency).toBe(3)
  })

  it('clearAll wipes everything', () => {
    const store = useConversionStore()
    store.addTask(makeTask())
    store.addTask(makeTask())
    store.clearAll()
    expect(store.total).toBe(0)
  })
})
