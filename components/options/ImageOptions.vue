<script setup lang="ts">
import { Settings2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { ImageOptions } from '@/types/imageOptions'

interface Props {
  modelValue: ImageOptions
  /** When true, show quality slider (lossy targets only). */
  qualityRelevant?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  qualityRelevant: true,
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

const widthValue = computed({
  get: () => String(props.modelValue.resize?.width ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    patch({
      resize: { ...props.modelValue.resize, width: n > 0 ? n : undefined },
    })
  },
})

const heightValue = computed({
  get: () => String(props.modelValue.resize?.height ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    patch({
      resize: { ...props.modelValue.resize, height: n > 0 ? n : undefined },
    })
  },
})

const stripValue = computed({
  get: () => props.modelValue.stripMetadata ?? false,
  set: (v: boolean) => patch({ stripMetadata: v }),
})
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

      <div class="grid grid-cols-[120px_1fr_8px_1fr] items-center gap-2">
        <label class="text-xs text-muted-foreground">{{ t('imageOptions.resize') }}</label>
        <Input
          type="number"
          min="0"
          :model-value="widthValue"
          :placeholder="t('imageOptions.width')"
          class="h-8 text-xs"
          @update:model-value="(v) => (widthValue = String(v))"
        />
        <span class="text-center text-xs text-muted-foreground">×</span>
        <Input
          type="number"
          min="0"
          :model-value="heightValue"
          :placeholder="t('imageOptions.height')"
          class="h-8 text-xs"
          @update:model-value="(v) => (heightValue = String(v))"
        />
      </div>

      <div class="flex items-center justify-between">
        <label class="text-xs text-muted-foreground">{{ t('imageOptions.stripMetadata') }}</label>
        <Switch :model-value="stripValue" @update:model-value="stripValue = $event" />
      </div>
    </div>
  </details>
</template>
