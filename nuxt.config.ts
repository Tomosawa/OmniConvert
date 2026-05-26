import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

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

  // Phase 4 will add COOP/COEP headers here for SharedArrayBuffer (FFmpeg).
  routeRules: {},

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
