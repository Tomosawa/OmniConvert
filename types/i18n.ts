/**
 * Locale codes supported by OmniConvert.
 * Phase 7 brings the full 11-language roster online.
 */
export type LocaleCode =
  | 'zh-CN'
  | 'zh-TW'
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'ru'
  | 'ja'
  | 'ko'
  | 'it'
  | 'pt'

export interface LocaleDescriptor {
  code: LocaleCode
  /** Native display name (used in switcher UI). */
  name: string
  /** BCP-47 tag for `<html lang>` and SEO. */
  iso: string
}

/** Theme preference exposed by `@nuxtjs/color-mode`. */
export type ThemePreference = 'light' | 'dark' | 'system'
