import { computed } from 'vue'

/**
 * Detect whether the app is running inside Tauri (desktop) or in a browser (web).
 *
 * Tauri 2.0 injects `window.__TAURI_INTERNALS__` into the webview. We use that
 * as the single source of truth for platform detection.
 */
export function usePlatform() {
  const isDesktop = computed(() => {
    if (typeof window === 'undefined') return false
    return '__TAURI_INTERNALS__' in window
  })

  const isWeb = computed(() => !isDesktop.value)

  return { isDesktop, isWeb }
}
