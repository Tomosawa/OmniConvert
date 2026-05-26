import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('lib/utils#cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles arrays and falsy values', () => {
    expect(cn('a', ['b', false, null, undefined], 'c')).toBe('a b c')
  })

  it('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-sm text-foreground', 'text-lg')).toBe(
      'text-foreground text-lg',
    )
  })

  it('returns empty string when given nothing', () => {
    expect(cn()).toBe('')
    expect(cn(false, null, undefined)).toBe('')
  })
})
