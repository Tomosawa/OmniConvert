import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { ThemePreference } from '@/types/i18n'

/**
 * Thin wrapper around `@nuxtjs/color-mode`'s `useColorMode()`.
 *
 * `useColorMode()` already handles persistence (cookie + localStorage) and
 * SSR/CSR negotiation, so this store mainly exists to give the rest of the
 * app a stable, typed surface to read/write the preference and to make
 * theme changes addressable from non-component contexts (e.g. tests).
 */
export const useThemeStore = defineStore('theme', () => {
  const colorMode = useColorMode()

  const preference = computed<ThemePreference>({
    get: () => colorMode.preference as ThemePreference,
    set: (value) => {
      colorMode.preference = value
    },
  })

  const resolved = computed<'light' | 'dark'>(() =>
    colorMode.value === 'dark' ? 'dark' : 'light',
  )

  function setPreference(value: ThemePreference): void {
    colorMode.preference = value
  }

  function cycle(): void {
    const order: ThemePreference[] = ['light', 'dark', 'system']
    const idx = order.indexOf(preference.value)
    setPreference(order[(idx + 1) % order.length] ?? 'system')
  }

  return {
    preference,
    resolved,
    setPreference,
    cycle,
  }
})
