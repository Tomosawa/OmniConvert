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

  // Phase 1 fully configures color-mode; minimal here to avoid module errors.
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  // Phase 1 expands locales to zh-CN + en; Phase 7 to 11 languages.
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    lazy: true,
    restructureDir: false,
    langDir: 'locales/',
    locales: [
      { code: 'zh-CN', iso: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
    ],
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
