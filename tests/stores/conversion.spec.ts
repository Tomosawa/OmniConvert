import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionTask } from '@/types/conversion'
import type { DetectedFile } from '@/types/file'

function makeDetected(name = 'a.png', ext = 'png'): DetectedFile {
  return {
    file: new File(['hello'], name, { type: 'image/png' }),
    category: 'image',
    mime: 'image/png',
    ext,
    magicMatch: true,
  }
}

function makeTask(overrides: Partial<ConversionTask> = {}): ConversionTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    fileItem: {
      id: 'file-1',
      detected: makeDetected(),
      targetFormat: 'jpg',
    },
    targetFormat: 'jpg',
    status: 'pending',
    progress: 0,
    ...overrides,
  }
}

describe('stores/conversion — task layer', () => {
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

  it('clearTasks wipes the task list', () => {
    const store = useConversionStore()
    store.addTask(makeTask())
    store.addTask(makeTask())
    store.clearTasks()
    expect(store.total).toBe(0)
  })
})

describe('stores/conversion — file-item layer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addDetected pushes a fresh FileItem with null target', () => {
    const store = useConversionStore()
    const item = store.addDetected(makeDetected('a.png'))
    expect(store.items.length).toBe(1)
    expect(item.targetFormat).toBe(null)
    expect(item.detected.ext).toBe('png')
  })

  it('setTargetFormat updates the matching item only', () => {
    const store = useConversionStore()
    const a = store.addDetected(makeDetected('a.png'))
    const b = store.addDetected(makeDetected('b.png'))
    store.setTargetFormat(a.id, 'jpg')
    expect(a.targetFormat).toBe('jpg')
    expect(b.targetFormat).toBe(null)
  })

  it('removeItem drops by id', () => {
    const store = useConversionStore()
    const a = store.addDetected(makeDetected('a.png'))
    store.addDetected(makeDetected('b.png'))
    store.removeItem(a.id)
    expect(store.items.length).toBe(1)
    expect(store.items[0]?.detected.file.name).toBe('b.png')
  })

  it('clearAll wipes both items and tasks', () => {
    const store = useConversionStore()
    store.addDetected(makeDetected())
    store.addTask(makeTask())
    store.clearAll()
    expect(store.items.length).toBe(0)
    expect(store.total).toBe(0)
  })
})
