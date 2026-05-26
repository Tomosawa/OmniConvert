import { computed } from 'vue'
import type { LocaleCode, LocaleDescriptor } from '@/types/i18n'

/**
 * Thin convenience wrapper around `useI18n()` that exposes a typed surface
 * for switching locales and reading the descriptor list.
 *
 * Phase 7 will extend the descriptor list to all 11 locales — the contract
 * here intentionally stays loose (`LocaleCode` is a union of supported codes)
 * so callers don't need to change.
 */
export function useLocale() {
  const { locale, locales, setLocale, t } = useI18n()

  const current = computed<LocaleCode>(() => locale.value as LocaleCode)

  const available = computed<LocaleDescriptor[]>(() =>
    locales.value.map((l) => ({
      code: l.code as LocaleCode,
      name: typeof l.name === 'string' ? l.name : String(l.code),
      iso: typeof l.iso === 'string' ? l.iso : (l.code as string),
    })),
  )

  async function switchTo(code: LocaleCode): Promise<void> {
    await setLocale(code)
  }

  return {
    current,
    available,
    switchTo,
    t,
  }
}
