<script setup lang="ts">
import {
  ArrowRight,
  Download,
  FileImage,
  FileText,
  Film,
  Globe,
  Lock,
  Monitor,
  Zap,
} from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EXT_TO_CATEGORY, FORMAT_RECOMMENDATIONS } from '@/utils/formatTable'
import { usePlatform } from '@/composables/usePlatform'
import { useWasmPreload } from '@/composables/useWasmPreload'

const { t } = useI18n()
const { isDesktop } = usePlatform()
const { preload } = useWasmPreload()

// On desktop, redirect immediately in setup (before any template renders).
// This is synchronous — no flash possible.
if (import.meta.client && isDesktop.value) {
  await navigateTo('/convert', { replace: true })
}

useHead({
  titleTemplate: () => 'OmniConvert',
})

// On web, start preloading WASM engines in the background while user browses
onMounted(() => {
  if (!isDesktop.value) {
    preload()
  }
})

const features = [
  { key: 'privacy', Icon: Lock },
  { key: 'engines', Icon: Zap },
  { key: 'platforms', Icon: Monitor },
] as const

const imageFormats = computed(() =>
  Object.keys(EXT_TO_CATEGORY).filter((e) => EXT_TO_CATEGORY[e] === 'image'),
)
const mediaFormats = computed(() =>
  Object.keys(EXT_TO_CATEGORY).filter((e) => EXT_TO_CATEGORY[e] === 'media'),
)
const documentFormats = computed(() =>
  Object.keys(EXT_TO_CATEGORY).filter((e) => EXT_TO_CATEGORY[e] === 'document'),
)

const formatGroups = computed(() => [
  { key: 'image', Icon: FileImage, formats: imageFormats.value },
  { key: 'media', Icon: Film, formats: mediaFormats.value },
  { key: 'document', Icon: FileText, formats: documentFormats.value },
])

const conversionCount = computed(() => {
  let count = 0
  for (const targets of Object.values(FORMAT_RECOMMENDATIONS)) {
    count += targets.length
  }
  return count
})
</script>

<template>
  <section v-if="!isDesktop" class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
    <div class="mx-auto max-w-3xl text-center">
      <h1 class="text-5xl font-bold tracking-tight sm:text-6xl">
        OmniConvert
      </h1>
      <p class="mt-4 text-xl text-muted-foreground">
        {{ t('landing.tagline') }}
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ t('landing.conversionCount', { n: conversionCount }) }}
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <NuxtLink to="/convert">
          <Button size="lg" class="gap-2 text-base">
            <Globe class="h-5 w-5" />
            {{ t('landing.startWeb') }}
            <ArrowRight class="h-4 w-4" />
          </Button>
        </NuxtLink>
        <Button size="lg" variant="outline" class="gap-2 text-base" disabled>
          <Download class="h-5 w-5" />
          {{ t('landing.downloadClient') }}
          <span class="text-xs text-muted-foreground">({{ t('common.comingSoon') }})</span>
        </Button>
      </div>
    </div>

    <div class="mt-20 grid gap-6 sm:grid-cols-3">
      <Card v-for="f in features" :key="f.key">
        <CardHeader class="items-center text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <component :is="f.Icon" class="h-6 w-6" />
          </div>
          <CardTitle class="text-lg">
            {{ t(`landing.feature.${f.key}.title`) }}
          </CardTitle>
          <CardDescription>
            {{ t(`landing.feature.${f.key}.description`) }}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>

    <div class="mt-20">
      <h2 class="text-center text-2xl font-bold tracking-tight">
        {{ t('landing.formats.title') }}
      </h2>
      <p class="mt-2 text-center text-sm text-muted-foreground">
        {{ t('landing.formats.subtitle') }}
      </p>

      <div class="mt-8 grid gap-6 sm:grid-cols-3">
        <Card v-for="group in formatGroups" :key="group.key">
          <CardHeader>
            <div class="flex items-center gap-2">
              <component :is="group.Icon" class="h-5 w-5 text-primary" />
              <CardTitle class="text-base">
                {{ t(`landing.formats.${group.key}`) }}
              </CardTitle>
              <span class="ml-auto text-xs text-muted-foreground">
                {{ group.formats.length }} {{ t('landing.formats.unit') }}
              </span>
            </div>
            <CardDescription>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="fmt in group.formats"
                  :key="fmt"
                  class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs uppercase"
                >
                  {{ fmt }}<template v-if="fmt === 'pdf'"> ({{ t('landing.formats.clientOnly') }})</template>
                </span>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>

    <div class="mt-20 text-center">
      <h2 class="text-2xl font-bold tracking-tight">
        {{ t('landing.howItWorks.title') }}
      </h2>
      <div class="mt-8 grid gap-6 sm:grid-cols-4">
        <div v-for="i in 4" :key="i" class="flex flex-col items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          >
            {{ i }}
          </div>
          <p class="text-sm font-medium">
            {{ t(`landing.howItWorks.step${i}`) }}
          </p>
        </div>
      </div>
      <NuxtLink to="/convert" class="mt-8 inline-block">
        <Button size="lg" class="gap-2">
          {{ t('landing.startWeb') }}
          <ArrowRight class="h-4 w-4" />
        </Button>
      </NuxtLink>
    </div>
  </section>
</template>
