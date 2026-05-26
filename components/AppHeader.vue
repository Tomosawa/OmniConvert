<script setup lang="ts">
import LocaleToggle from '@/components/LocaleToggle.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const { t } = useI18n()
const config = useRuntimeConfig()
const version = config.public.appVersion as string
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="text-base">{{ t('app.name') }}</span>
        <span class="hidden text-xs text-muted-foreground sm:inline">v{{ version }}</span>
      </NuxtLink>

      <nav class="ml-6 hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
        <NuxtLink to="/" class="hover:text-foreground">{{ t('nav.home') }}</NuxtLink>
        <span class="cursor-not-allowed opacity-60" :title="t('common.comingSoon')">
          {{ t('nav.history') }}
        </span>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
