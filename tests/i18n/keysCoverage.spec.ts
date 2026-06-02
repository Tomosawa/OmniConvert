import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Bag = Record<string, unknown>

function load(code: string): Bag {
  const path = resolve(__dirname, '..', '..', 'locales', `${code}.json`)
  return JSON.parse(readFileSync(path, 'utf-8')) as Bag
}

function flatKeys(obj: Bag, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatKeys(v as Bag, path))
    } else {
      out.push(path)
    }
  }
  return out
}

const LOCALE_CODES = [
  'zh-CN',
  'zh-TW',
  'en',
  'fr',
  'de',
  'es',
  'ru',
  'ja',
  'ko',
  'it',
  'pt',
] as const

const ALL_LOCALES: Record<string, Bag> = Object.fromEntries(
  LOCALE_CODES.map((code) => [code, load(code)]),
)

describe('locales — key coverage', () => {
  const expected = flatKeys(ALL_LOCALES['zh-CN']!).sort()

  it('covers exactly 11 locales', () => {
    expect(Object.keys(ALL_LOCALES).length).toBe(11)
  })

  it.each(LOCALE_CODES)('%s has the same key set as zh-CN', (code) => {
    const actual = flatKeys(ALL_LOCALES[code]!).sort()
    expect(actual).toEqual(expected)
  })

  it.each(LOCALE_CODES)('%s has no empty leaf strings', (code) => {
    const empty: string[] = []
    const visit = (obj: Bag, prefix = ''): void => {
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          visit(v as Bag, p)
        } else if (typeof v !== 'string' || v.trim() === '') {
          empty.push(p)
        }
      }
    }
    visit(ALL_LOCALES[code]!)
    expect(empty).toEqual([])
  })

  it.each([
    ['app.version', '{version}'],
    ['upload.selected', '{count}'],
    ['task.failedCount', '{n}'],
    ['batch.downloadZip', '{n}'],
    ['largeFile.description', '{threshold}'],
  ])('every locale preserves %s placeholder %s', (path, placeholder) => {
    for (const [code, bag] of Object.entries(ALL_LOCALES)) {
      const value = path.split('.').reduce<unknown>((acc, segment) => {
        return acc && typeof acc === 'object'
          ? (acc as Bag)[segment]
          : undefined
      }, bag)
      expect(typeof value).toBe('string')
      expect(
        (value as string).includes(placeholder),
        `${code} ${path}`,
      ).toBe(true)
    }
  })
})
