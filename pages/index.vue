<script setup lang="ts">
import { FileImage, FileText, Film, Loader2, ShieldCheck, Wand2 } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import FileList from '@/components/FileList.vue'
import TaskList from '@/components/TaskList.vue'
import UploadDropzone from '@/components/UploadDropzone.vue'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useConversionDispatcher } from '@/composables/useConversionDispatcher'
import { detectFile } from '@/composables/useFileDetection'
import { useConversionStore } from '@/stores/conversion'

const { t } = useI18n()
const store = useConversionStore()
const dispatcher = useConversionDispatcher()

const features = [
  { key: 'privacy', Icon: ShieldCheck },
  { key: 'engines', Icon: FileImage },
  { key: 'platforms', Icon: Film },
] as const

useHead({
  titleTemplate: (title) => (title ? `${title} · OmniConvert` : 'OmniConvert'),
})

onMounted(() => dispatcher.install())
onBeforeUnmount(() => dispatcher.uninstall())

async function handleFiles(files: File[]): Promise<void> {
  for (const file of files) {
    const detected = await detectFile(file)
    store.addDetected(detected)
  }
}

const eligibleCount = computed(() =>
  store.items.filter(
    (i) => i.targetFormat && i.detected.category !== 'unknown',
  ).length,
)

const canConvert = computed(() => eligibleCount.value > 0 && !store.isAnyRunning)

async function startConversion(): Promise<void> {
  await store.startConversion()
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="max-w-3xl">
      <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
        {{ t('home.heading') }}
      </h1>
      <p class="mt-4 text-lg text-muted-foreground">
        {{ t('app.tagline') }}
      </p>
    </div>

    <div class="mt-10 space-y-6">
      <UploadDropzone @files="handleFiles" />
      <FileList />

      <div v-if="store.items.length > 0" class="flex justify-end">
        <Button
          :disabled="!canConvert"
          class="gap-2"
          @click="startConversion"
        >
          <Loader2 v-if="store.isAnyRunning" class="h-4 w-4 animate-spin" />
          <Wand2 v-else class="h-4 w-4" />
          {{ store.isAnyRunning ? t('convert.running') : t('convert.start') }}
        </Button>
      </div>

      <TaskList />
    </div>

    <div class="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="f in features" :key="f.key">
        <CardHeader class="flex flex-row items-start gap-3 space-y-0">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
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

    <Card class="mt-8">
      <div class="flex items-start gap-3 p-6">
        <FileText class="mt-0.5 h-5 w-5 text-muted-foreground" />
        <p class="text-sm text-muted-foreground">
          {{ t('home.bootstrapNotice') }}
        </p>
      </div>
    </Card>
  </section>
</template>
