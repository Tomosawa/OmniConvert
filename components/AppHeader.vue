<script setup lang="ts">
import LocaleToggle from '@/components/LocaleToggle.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { usePlatform } from '@/composables/usePlatform'

const { t } = useI18n()
const config = useRuntimeConfig()
const version = config.public.appVersion as string
const { isDesktop } = usePlatform()

const route = useRoute()
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
      <NuxtLink :to="isDesktop ? '/convert' : '/'" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="text-base">{{ t('app.name') }}</span>
        <span class="hidden text-xs text-muted-foreground sm:inline">v{{ version }}</span>
        <span v-if="isDesktop" class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Desktop
        </span>
      </NuxtLink>

      <nav class="ml-6 hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
        <NuxtLink
          v-if="!isDesktop"
          to="/"
          :class="route.path === '/' ? 'text-foreground font-medium' : 'hover:text-foreground'"
        >
          {{ t('nav.home') }}
        </NuxtLink>
        <NuxtLink
          to="/convert"
          :class="route.path === '/convert' ? 'text-foreground font-medium' : 'hover:text-foreground'"
        >
          {{ t('nav.convert') }}
        </NuxtLink>
        <NuxtLink
          to="/history"
          :class="route.path === '/history' ? 'text-foreground font-medium' : 'hover:text-foreground'"
        >
          {{ t('nav.history') }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
