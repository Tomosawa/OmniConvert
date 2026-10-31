<script setup lang="ts">
import { Check, RotateCw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useConversionDispatcher } from '@/composables/useConversionDispatcher'
import { detectFile } from '@/composables/useFileDetection'
import { useConversionStore } from '@/stores/conversion'

import WasmPreloadBar from '@/components/WasmPreloadBar.vue'
import ConvertStepUpload from '@/components/convert/StepUpload.vue'
import ConvertStepConfigure from '@/components/convert/StepConfigure.vue'
import ConvertStepProgress from '@/components/convert/StepProgress.vue'
import ConvertStepResult from '@/components/convert/StepResult.vue'
import { useWasmPreload } from '@/composables/useWasmPreload'
import { usePlatform } from '@/composables/usePlatform'

const { allReady: enginesReady, preload } = useWasmPreload()
const { isDesktop } = usePlatform()

// Ensure preload starts even if user navigates directly to /convert
// On desktop, native CLI handles conversions — no WASM needed
if (!isDesktop.value) {
  preload()
}

type Step = 'upload' | 'configure' | 'progress' | 'result'

const { t } = useI18n()
const store = useConversionStore()
const dispatcher = useConversionDispatcher()

const currentStep = ref<Step>('upload')

const steps = computed(() => [
  { key: 'upload', label: t('convert.step.upload'), index: 1 },
  { key: 'configure', label: t('convert.step.configure'), index: 2 },
  { key: 'progress', label: t('convert.step.progress'), index: 3 },
  { key: 'result', label: t('convert.step.result'), index: 4 },
] as const)

const stepIndex = computed(() =>
  steps.value.findIndex((s) => s.key === currentStep.value),
)

useHead({
  titleTemplate: (title) => (title ? `${title} · OmniConvert` : `${t('convert.title')} · OmniConvert`),
})

onMounted(() => dispatcher.install())
onBeforeUnmount(() => dispatcher.uninstall())

async function handleFiles(files: File[]): Promise<void> {
  for (const file of files) {
    const detected = await detectFile(file)
    store.addDetected(detected)
  }
  if (store.items.length > 0 && currentStep.value === 'upload') {
    currentStep.value = 'configure'
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
  currentStep.value = 'progress'
}

function goBack(): void {
  const idx = stepIndex.value
  if (idx > 0) {
    currentStep.value = steps.value[idx - 1]!.key as Step
  }
}

function startNew(): void {
  store.clearAll()
  currentStep.value = 'upload'
}

watch(
  () => store.isAnyRunning,
  (running, wasRunning) => {
    if (wasRunning && !running && currentStep.value === 'progress') {
      currentStep.value = 'result'
    }
  },
)

watch(
  () => store.items.length,
  (len) => {
    if (len === 0 && currentStep.value !== 'upload') {
      currentStep.value = 'upload'
    }
  },
)
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold tracking-tight">
          {{ t('convert.title') }}
        </h1>
        <Button
          v-if="currentStep !== 'upload'"
          variant="ghost"
          size="sm"
          class="gap-2"
          @click="startNew"
        >
          <RotateCw class="h-3.5 w-3.5" />
          {{ t('convert.newTask') }}
        </Button>
      </div>

      <div class="mt-4 flex items-center gap-1">
        <template v-for="(step, idx) in steps" :key="step.key">
          <div
            class="flex items-center gap-2"
            :class="idx <= stepIndex ? 'text-primary' : 'text-muted-foreground'"
          >
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              :class="
                idx < stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : idx === stepIndex
                    ? 'border-2 border-primary text-primary'
                    : 'border border-muted-foreground/30 text-muted-foreground'
              "
            >
              <Check v-if="idx < stepIndex" class="h-3.5 w-3.5" />
              <span v-else>{{ step.index }}</span>
            </div>
            <span class="hidden text-sm font-medium sm:inline">{{ step.label }}</span>
          </div>
          <div
            v-if="idx < steps.length - 1"
            class="mx-1 h-px flex-1"
            :class="idx < stepIndex ? 'bg-primary' : 'bg-muted'"
          />
        </template>
      </div>
    </div>

    <!-- Show full-screen preload bar while engines are loading (web only) -->
    <WasmPreloadBar v-if="!isDesktop && !enginesReady" />

    <!-- Show conversion steps: always on desktop, or on web once engines are ready -->
    <template v-if="isDesktop || enginesReady">
      <ConvertStepUpload
        v-if="currentStep === 'upload'"
        @files="handleFiles"
      />

      <ConvertStepConfigure
        v-else-if="currentStep === 'configure'"
        :can-convert="canConvert"
        :eligible-count="eligibleCount"
        @back="goBack"
        @start="startConversion"
        @add-files="handleFiles"
      />

      <ConvertStepProgress
        v-else-if="currentStep === 'progress'"
      />

      <ConvertStepResult
        v-else-if="currentStep === 'result'"
        @new-task="startNew"
      />
    </template>
  </section>
</template>
