/**
 * Desktop redirect plugin — runs before first render on the client.
 * On Tauri desktop, skip the landing page entirely and go straight to /convert.
 *
 * This runs earlier than route middleware (which fires after Nuxt hydrates the
 * current route), preventing the "flash of landing page" on desktop.
 */
export default defineNuxtPlugin({
  name: 'desktop-redirect',
  enforce: 'pre', // run before other plugins
  setup() {
    // __TAURI_INTERNALS__ is injected by Tauri at runtime
    const isDesktop =
      typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window

    if (!isDesktop) return

    const router = useRouter()
    const route = useRoute()

    // If we're at the landing page, immediately redirect to /convert
    // before any component renders
    router.beforeEach((to) => {
      if (to.path === '/') {
        return '/convert'
      }
    })

    // If already at '/', navigate now
    if (route.path === '/') {
      router.replace('/convert')
    }
  },
})
