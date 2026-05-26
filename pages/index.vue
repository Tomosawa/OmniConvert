<script setup lang="ts">
import { FileImage, FileText, Film, ShieldCheck } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()

const features = [
  { key: 'privacy', Icon: ShieldCheck },
  { key: 'engines', Icon: FileImage },
  { key: 'platforms', Icon: Film },
] as const

useHead({
  titleTemplate: (title) => (title ? `${title} · OmniConvert` : 'OmniConvert'),
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
    <div class="max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
        {{ t('home.heading') }}
      </h1>
      <p class="mt-4 text-lg text-muted-foreground">
        {{ t('app.tagline') }}
      </p>
    </div>

    <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="f in features" :key="f.key">
        <CardHeader class="flex flex-row items-start gap-3 space-y-0">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <component :is="f.Icon" class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <CardTitle class="text-lg">
              {{ t(`home.feature.${f.key}.title`) }}
            </CardTitle>
            <CardDescription>
              {{ t(`home.feature.${f.key}.description`) }}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>

    <Card class="mt-10">
      <CardContent class="p-6">
        <div class="flex items-start gap-3">
          <FileText class="mt-0.5 h-5 w-5 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">
            {{ t('home.bootstrapNotice') }}
          </p>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
