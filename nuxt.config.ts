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

  // Phase 7 will expand locales to all 11 languages.
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    lazy: true,
    restructureDir: false,
    langDir: 'locales/',
    locales: [
      { code: 'zh-CN', iso: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' },
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
  },

  // pandoc-wasm uses the (proposed) ESM Wasm-import syntax; vite needs the
  // wasm + top-level-await plugins to handle it. Other engines (magick-wasm,
  // ffmpeg) use plain `?url` imports and don't depend on these plugins.
  vite: {
    plugins: [wasm(), topLevelAwait()],
    optimizeDeps: {
      // pandoc-wasm uses ESM Wasm imports + top-level-await + WASI imports
      // — pre-bundling it confuses Rollup. Force browser to use the source.
      exclude: ['pandoc-wasm'],
    },
    build: {
      rollupOptions: {
        // The Wasm binary imports `wasi_snapshot_preview1` symbolically; the
        // pandoc-wasm runtime polyfills it via @bjorn3/browser_wasi_shim at
        // runtime, so we tell Rollup to leave the import alone.
        external: ['wasi_snapshot_preview1'],
      },
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
