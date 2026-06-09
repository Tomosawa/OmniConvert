import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-25',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
  ],

  postcss: {
    plugins: {
      'postcss-import': {},
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  css: ['~/assets/css/tailwind.css'],

  // shadcn-vue components live under components/ui/* with index barrels.
  // We import them explicitly via `@/components/ui/*` aliases, so we tell
  // Nuxt to skip auto-registering that subtree to avoid duplicate-name warnings.
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/ui/**'],
    },
  ],

  // Phase 1 fully configures color-mode; minimal here to avoid module errors.
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  // Phase 7: full 11-locale roster.
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    lazy: true,
    restructureDir: false,
    langDir: 'locales/',
    locales: [
      { code: 'zh-CN', iso: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'zh-TW', iso: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', iso: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'de', iso: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'es', iso: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'ru', iso: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'ja', iso: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'ko', iso: 'ko-KR', name: '한국어', file: 'ko.json' },
      { code: 'it', iso: 'it-IT', name: 'Italiano', file: 'it.json' },
      { code: 'pt', iso: 'pt-PT', name: 'Português', file: 'pt.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'omniconvert_locale',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  // SharedArrayBuffer required by @ffmpeg/ffmpeg multi-threaded core.
  // Both COOP and COEP headers must be set so the page is cross-origin
  // isolated. Phase 9 mirrors these in vercel.json for the deployed Web build.
  routeRules: {
    '/**': {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    },
  },

  runtimeConfig: {
    public: {
      appName: 'OmniConvert',
      appVersion: '0.0.1',
      largeFileThreshold: 524288000,
      enableHistory: true,
      defaultConcurrency: 2,
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // explicit `pnpm typecheck` keeps dev fast
  },

  alias: {
    '~': fileURLToPath(new URL('./', import.meta.url)),
    '@': fileURLToPath(new URL('./', import.meta.url)),
    // Allow direct import of pandoc-wasm's core module (bypasses package exports)
    'pandoc-wasm/src/core.js': fileURLToPath(new URL('./node_modules/pandoc-wasm/src/core.js', import.meta.url)),
  },

  // pandoc-wasm uses fetch() + WebAssembly.instantiate() internally to load
  // its WASM binary — it must NOT go through vite-plugin-wasm, which would
  // replace the WASM file with an already-instantiated module object.
  // The `pandoc-url` plugin (enforce:'pre') intercepts the pandoc.wasm import
  // BEFORE vite-plugin-wasm sees it and converts it to a plain ?url import,
  // so pandoc-wasm/src/index.browser.js receives a URL string it can fetch().
  //
  // vite-plugin-wasm + top-level-await are still needed for magick-wasm and
  // other WASM engines that use the ESM Wasm-import syntax.
  vite: {
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
      // Fix: @parcel/watcher's native FSEvents file descriptors conflict with
      // child_process.spawn (esbuild), causing "spawn EBADF" on macOS.
      // CHOKIDAR_USEPOLLING=true (set in the dev script) disables the native
      // watcher globally; usePolling here covers any late-created watchers.
      // See: https://github.com/nuxt/nuxt/issues/29744
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    plugins: [
      // Must come before vite-plugin-wasm so pandoc.wasm is claimed first.
      // pandoc-wasm/src/index.browser.js does:
      //   const mod = await import("./pandoc.wasm")
      //   const url  = mod.default          // expects a URL string
      //   const buf  = await fetch(url).then(r => r.arrayBuffer())
      //   WebAssembly.instantiate(buf, { wasi_snapshot_preview1: wasi.wasiImport })
      //
      // vite-plugin-wasm would intercept pandoc.wasm and replace it with an
      // already-instantiated WASM module object, breaking the fetch() step.
      // This plugin claims pandoc.wasm first (enforce:'pre') and re-exports
      // it as a ?url import so index.browser.js gets the URL it needs.
      {
        name: 'pandoc-url',
        enforce: 'pre' as const,
        resolveId(id: string, importer?: string) {
          // Case 0: virtual module — exposes the pandoc.wasm URL to application
          // code (the preload composable) so it can fetch the WASM file with
          // progress tracking before the engine needs it.
          if (id === 'virtual:pandoc-wasm-url') return '\0virtual:pandoc-wasm-url'

          // Intercept WASM imports that need to be loaded as URLs (not instantiated).
          // 1. pandoc.wasm: pandoc-wasm does its own fetch() + instantiate()
          // 2. magick.wasm?url: ImageMagick worker needs the URL for initializeImageMagick()
          //
          // Both must bypass vite-plugin-wasm (which would instantiate them).
          // We resolve to the real file path + ?url so Vite's asset pipeline
          // serves them as static files and returns URL strings.

          // Case 1: pandoc.wasm from pandoc-wasm package
          if (id.endsWith('/pandoc.wasm') && importer?.includes('pandoc-wasm')) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { createRequire } = require('node:module') as typeof import('node:module')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { dirname, join } = require('node:path') as typeof import('node:path')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { existsSync } = require('node:fs') as typeof import('node:fs')
            const req = createRequire(import.meta.url)
            const mainEntry: string = req.resolve('pandoc-wasm')
            const pkgRoot: string = dirname(dirname(mainEntry))
            const wasmPath: string = join(pkgRoot, 'src', 'pandoc.wasm')
            if (!existsSync(wasmPath)) {
              throw new Error(`pandoc-url plugin: pandoc.wasm not found at ${wasmPath}`)
            }
            return wasmPath + '?url'
          }

          // Case 2: magick.wasm?url from @imagemagick/magick-wasm
          if (id.includes('magick.wasm') && id.includes('?url')) {
            // Strip the ?url query to get the base module specifier
            const baseId = id.replace(/\?url$/, '')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { createRequire } = require('node:module') as typeof import('node:module')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { existsSync } = require('node:fs') as typeof import('node:fs')
            const req = createRequire(import.meta.url)
            try {
              // Try to resolve via package.json exports (magick-wasm defines './magick.wasm')
              const wasmPath: string = req.resolve(baseId)
              if (existsSync(wasmPath)) {
                return wasmPath + '?url'
              }
            } catch {
              // If exports resolution fails, fall through to default handling
            }
          }
        },
        load(id: string) {
          // Resolve the virtual module to a re-export of pandoc.wasm via Vite's
          // ?url asset pipeline. Vite replaces the path with a hashed URL at
          // build time, so the composable receives the final asset URL.
          if (id === '\0virtual:pandoc-wasm-url') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { createRequire } = require('node:module') as typeof import('node:module')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { dirname, join } = require('node:path') as typeof import('node:path')
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { existsSync } = require('node:fs') as typeof import('node:fs')
            const req = createRequire(import.meta.url)
            const mainEntry: string = req.resolve('pandoc-wasm')
            const pkgRoot: string = dirname(dirname(mainEntry))
            const wasmPath: string = join(pkgRoot, 'src', 'pandoc.wasm')
            if (!existsSync(wasmPath)) {
              throw new Error(`pandoc-url plugin: pandoc.wasm not found at ${wasmPath}`)
            }
            return `export { default } from ${JSON.stringify(wasmPath + '?url')}`
          }
        },
      },
      wasm(),
      topLevelAwait(),
    ],
    optimizeDeps: {
      exclude: ['pandoc-wasm', '@ffmpeg/ffmpeg', '@ffmpeg/core', '@ffmpeg/util'],
    },
    build: {
      assetsInlineLimit: 0,
    },
  },

  app: {
    head: {
      title: 'OmniConvert',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'OmniConvert — Privacy-first local file converter. Images, audio/video, and documents converted entirely in your browser via WebAssembly. Zero uploads.',
        },
      ],
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
})
