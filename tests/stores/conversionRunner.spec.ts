import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionRunner } from '@/stores/conversion'
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

function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

describe('stores/conversion — runner + startConversion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    if (!('createObjectURL' in URL)) {
      // @ts-expect-error happy-dom always provides this; guard for safety
      URL.createObjectURL = vi.fn(() => 'blob:mock')
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  it('startConversion turns eligible items into success tasks', async () => {
    const store = useConversionStore()
    const runner: ConversionRunner = vi.fn(async (_t, onProgress) => {
      onProgress(50)
      onProgress(100)
      return { blob: new Blob(['out'], { type: 'image/jpeg' }) }
    })
    store.setRunner(runner)

    const item = store.addDetected(makeDetected())
    store.setTargetFormat(item.id, 'jpg')

    await store.startConversion()
    while (store.running.length > 0) await flush()
    await flush()

    expect(runner).toHaveBeenCalledTimes(1)
    expect(store.tasks.length).toBe(1)
    expect(store.tasks[0]?.status).toBe('success')
    expect(store.tasks[0]?.progress).toBe(100)
    expect(store.tasks[0]?.resultUrl).toBe('blob:mock')
  })

  it('skips items without a target format', async () => {
    const store = useConversionStore()
    store.setRunner(vi.fn(async () => ({ blob: new Blob() })))

    store.addDetected(makeDetected('a.png'))
    const b = store.addDetected(makeDetected('b.png'))
    store.setTargetFormat(b.id, 'jpg')

    await store.startConversion()
    await flush()

    expect(store.tasks.length).toBe(1)
  })

  it('caps in-flight tasks at the configured concurrency', async () => {
    const store = useConversionStore()
    store.setConcurrency(2)
    let inFlight = 0
    let peak = 0
    const runner: ConversionRunner = async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await flush()
      await flush()
      inFlight--
      return { blob: new Blob() }
    }
    store.setRunner(runner)

    for (let i = 0; i < 5; i++) {
      const item = store.addDetected(makeDetected(`f${i}.png`))
      store.setTargetFormat(item.id, 'jpg')
    }

    await store.startConversion()
    while (store.running.length > 0 || store.pending.length > 0) await flush()
    await flush()

    expect(peak).toBeLessThanOrEqual(2)
    expect(store.successCount).toBe(5)
  })

  it('marks tasks as error when the runner throws', async () => {
    const store = useConversionStore()
    store.setRunner(vi.fn(async () => {
      throw new Error('boom')
    }))

    const item = store.addDetected(makeDetected())
    store.setTargetFormat(item.id, 'jpg')
    await store.startConversion()
    while (store.running.length > 0) await flush()
    await flush()

    expect(store.tasks[0]?.status).toBe('error')
    expect(store.tasks[0]?.error).toBe('boom')
  })

  it('retry() puts a failed task back into the queue', async () => {
    const store = useConversionStore()
    let attempts = 0
    store.setRunner(async () => {
      attempts++
      if (attempts === 1) throw new Error('flaky')
      return { blob: new Blob(['ok']) }
    })

    const item = store.addDetected(makeDetected())
    store.setTargetFormat(item.id, 'jpg')
    await store.startConversion()
    while (store.running.length > 0) await flush()
    await flush()
    expect(store.tasks[0]?.status).toBe('error')

    store.retry(store.tasks[0]!.id)
    while (store.running.length > 0 || store.pending.length > 0) await flush()
    await flush()

    expect(attempts).toBe(2)
    expect(store.tasks[0]?.status).toBe('success')
  })

  it('throws when no runner is configured', async () => {
    const store = useConversionStore()
    store.addDetected(makeDetected())
    store.setTargetFormat(store.items[0]!.id, 'jpg')
    await expect(store.startConversion()).rejects.toThrow(/runner/i)
  })
})
