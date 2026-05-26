/**
 * Locale codes supported by OmniConvert.
 * Phase 1 ships zh-CN + en; Phase 7 will extend this to 11 locales.
 */
export type LocaleCode = 'zh-CN' | 'en'

export interface LocaleDescriptor {
  code: LocaleCode
  /** Native display name (used in switcher UI). */
  name: string
  /** BCP-47 tag for `<html lang>` and SEO. */
  iso: string
}

/** Theme preference exposed by `@nuxtjs/color-mode`. */
export type ThemePreference = 'light' | 'dark' | 'system'
