<script setup lang="ts">
import { Link2, Link2Off, Settings2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { ImageOptions } from '@/types/imageOptions'
import type { ImageDimensions } from '@/types/file'

interface Props {
  modelValue: ImageOptions
  qualityRelevant?: boolean
  originalDimensions?: ImageDimensions
}

const props = withDefaults(defineProps<Props>(), {
  qualityRelevant: true,
  originalDimensions: undefined,
})

const emits = defineEmits<{
  'update:modelValue': [value: ImageOptions]
}>()

const { t } = useI18n()

function patch(partial: Partial<ImageOptions>): void {
  emits('update:modelValue', { ...props.modelValue, ...partial })
}

const quality = computed({
  get: () => props.modelValue.quality ?? 90,
  set: (raw: string | number) => {
    const n = Math.max(1, Math.min(100, Number(raw) || 90))
    patch({ quality: n })
  },
})

const aspectLocked = ref(true)
const aspectRatio = computed(() => {
  const d = props.originalDimensions
  if (d && d.width > 0 && d.height > 0) return d.width / d.height
  return 0
})

const widthValue = computed({
  get: () => String(props.modelValue.resize?.width ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const resize = { ...props.modelValue.resize, width: n > 0 ? n : undefined }
    if (n > 0 && aspectLocked.value && aspectRatio.value > 0) {
      resize.height = Math.round(n / aspectRatio.value)
    }
    patch({ resize })
  },
})

const heightValue = computed({
  get: () => String(props.modelValue.resize?.height ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const resize = { ...props.modelValue.resize, height: n > 0 ? n : undefined }
    if (n > 0 && aspectLocked.value && aspectRatio.value > 0) {
      resize.width = Math.round(n * aspectRatio.value)
    }
    patch({ resize })
  },
})

const stripValue = computed({
  get: () => props.modelValue.stripMetadata ?? false,
  set: (v: boolean) => patch({ stripMetadata: v }),
})

function fillOriginal(): void {
  const d = props.originalDimensions
  if (!d) return
  patch({ resize: { width: d.width, height: d.height } })
}

function clearResize(): void {
  patch({ resize: undefined })
}

const hasResize = computed(() => {
  const r = props.modelValue.resize
  return r && (r.width || r.height)
})

watch(
  () => props.originalDimensions,
  (dims) => {
    if (dims && !hasResize.value) {
      patch({ resize: { width: dims.width, height: dims.height } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <details class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <summary class="flex cursor-pointer select-none items-center gap-2 font-medium">
      <Settings2 class="h-4 w-4" />
      {{ t('imageOptions.heading') }}
    </summary>

    <div class="mt-3 space-y-3 pt-1">
      <div v-if="qualityRelevant" class="grid grid-cols-[120px_1fr_56px] items-center gap-2">
        <label class="text-xs text-muted-foreground">{{ t('imageOptions.quality') }}</label>
        <input
          type="range"
          min="1"
          max="100"
          :value="quality"
          class="accent-primary"
          @input="quality = Number(($event.target as HTMLInputElement).value)"
        >
        <span class="text-right text-xs tabular-nums">{{ quality }}</span>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-xs text-muted-foreground">{{ t('imageOptions.resize') }}</label>
          <span v-if="originalDimensions" class="text-xs text-muted-foreground">
            {{ t('imageOptions.original') }}: {{ originalDimensions.width }} × {{ originalDimensions.height }}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <Input
            type="number"
            min="1"
            :model-value="widthValue"
            :placeholder="t('imageOptions.width')"
            class="h-8 flex-1 text-xs"
            @update:model-value="(v) => (widthValue = String(v))"
          />
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            :title="aspectLocked ? t('imageOptions.unlockAspect') : t('imageOptions.lockAspect')"
            @click="aspectLocked = !aspectLocked"
          >
            <Link2 v-if="aspectLocked" class="h-3.5 w-3.5 text-primary" />
            <Link2Off v-else class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Input
            type="number"
            min="1"
            :model-value="heightValue"
            :placeholder="t('imageOptions.height')"
            class="h-8 flex-1 text-xs"
            @update:model-value="(v) => (heightValue = String(v))"
          />
        </div>

        <div class="mt-1.5 flex gap-2">
          <button
            v-if="originalDimensions"
            type="button"
            class="text-xs text-primary underline-offset-2 hover:underline"
            @click="fillOriginal"
          >
            {{ t('imageOptions.resetToOriginal') }}
          </button>
          <button
            v-if="hasResize"
            type="button"
            class="text-xs text-muted-foreground underline-offset-2 hover:underline"
            @click="clearResize"
          >
            {{ t('imageOptions.clearResize') }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <label class="text-xs text-muted-foreground">{{ t('imageOptions.stripMetadata') }}</label>
        <Switch :model-value="stripValue" @update:model-value="stripValue = $event" />
      </div>
    </div>
  </details>
</template>
