import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { __resetHistoryDbForTests, useHistory } from '@/composables/useHistory'

function makeRecord(overrides: Partial<Parameters<ReturnType<typeof useHistory>['append']>[0]> = {}) {
  return {
    id: overrides.id ?? `r-${Math.random().toString(36).slice(2, 8)}`,
    fileName: 'photo.png',
    sourceFormat: 'png',
    targetFormat: 'jpg',
    category: 'image' as const,
    sizeBytes: 1024,
    outputBytes: 800,
    durationMs: 250,
    status: 'success' as const,
    completedAt: Date.now(),
    ...overrides,
  }
}

describe('composables/useHistory', () => {
  beforeEach(() => {
    // Reset to a fresh fake IDB factory before each test (setup.ts already
    // installed fake-indexeddb globally, so we just swap in a clean store).
    ;(globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
    __resetHistoryDbForTests()
  })

  afterEach(() => {
    __resetHistoryDbForTests()
  })

  it('starts empty', async () => {
    const history = useHistory()
    expect(await history.list()).toEqual([])
  })

  it('persists records and lists them newest-first', async () => {
    const history = useHistory()
    const t0 = Date.now()
    await history.append(makeRecord({ id: 'a', completedAt: t0 - 100 }))
    await history.append(makeRecord({ id: 'b', completedAt: t0 }))
    await history.append(makeRecord({ id: 'c', completedAt: t0 - 200 }))

    const list = await history.list()
    expect(list.map((r) => r.id)).toEqual(['b', 'a', 'c'])
  })

  it('removes by id', async () => {
    const history = useHistory()
    await history.append(makeRecord({ id: 'a' }))
    await history.append(makeRecord({ id: 'b' }))
    await history.remove('a')

    const list = await history.list()
    expect(list.map((r) => r.id)).toEqual(['b'])
  })

  it('clear() drops everything', async () => {
    const history = useHistory()
    await history.append(makeRecord({ id: 'a' }))
    await history.append(makeRecord({ id: 'b' }))
    await history.clear()
    expect(await history.list()).toEqual([])
  })

  it('respects the list limit', async () => {
    const history = useHistory()
    for (let i = 0; i < 5; i++) {
      await history.append(makeRecord({ id: `r${i}`, completedAt: i }))
    }
    const list = await history.list(3)
    expect(list.length).toBe(3)
    expect(list[0]?.id).toBe('r4')
  })

  it('preserves error records', async () => {
    const history = useHistory()
    await history.append(
      makeRecord({ id: 'err', status: 'error', error: 'boom', outputBytes: 0 }),
    )
    const list = await history.list()
    expect(list[0]?.status).toBe('error')
    expect(list[0]?.error).toBe('boom')
  })
})
