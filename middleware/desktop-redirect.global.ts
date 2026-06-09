import { usePlatform } from '@/composables/usePlatform'

/**
 * Global route middleware: on desktop (Tauri), skip the landing page and
 * redirect directly to /convert. This avoids the "flash" of the landing
 * page that occurs when the redirect happens in onMounted.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return // SSR — let the page render normally
  const { isDesktop } = usePlatform()
  if (isDesktop.value && to.path === '/') {
    return navigateTo('/convert', { redirectCode: 302 })
  }
})