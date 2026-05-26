import { describe, it, expect } from 'vitest'

describe('smoke: vitest is wired up', () => {
  it('can run a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('has the expected runtime environment', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })
})
