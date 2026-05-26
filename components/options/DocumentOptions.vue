<script setup lang="ts">
import { Settings2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import type { DocumentOptions } from '@/types/documentOptions'

interface Props {
  modelValue: DocumentOptions
  /** Lowercase target extension (drives which fields are relevant). */
  targetExt: string
}

const props = defineProps<Props>()
const emits = defineEmits<{
  'update:modelValue': [value: DocumentOptions]
}>()

const { t } = useI18n()

function patch(partial: Partial<DocumentOptions>): void {
  emits('update:modelValue', { ...props.modelValue, ...partial })
}

const supportsCss = computed(() =>
  ['html', 'epub'].includes(props.targetExt.toLowerCase()),
)

const standalone = computed({
  get: () => props.modelValue.standalone ?? false,
  set: (v: boolean) => patch({ standalone: v }),
})

const toc = computed({
  get: () => props.modelValue.toc ?? false,
  set: (v: boolean) => patch({ toc: v }),
})

const css = computed({
  get: () => props.modelValue.css ?? '',
  set: (raw: string | number) => {
    const value = String(raw).trim()
    patch({ css: value || undefined })
  },
})
</script>

<template>
  <details class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <summary class="flex cursor-pointer select-none items-center gap-2 font-medium">
      <Settings2 class="h-4 w-4" />
      {{ t('documentOptions.heading') }}
    </summary>

    <div class="mt-3 space-y-3 pt-1">
      <div class="flex items-center justify-between">
        <label class="text-xs text-muted-foreground">{{ t('documentOptions.standalone') }}</label>
        <Switch :model-value="standalone" @update:model-value="standalone = $event" />
      </div>

      <div class="flex items-center justify-between">
        <label class="text-xs text-muted-foreground">{{ t('documentOptions.toc') }}</label>
        <Switch :model-value="toc" @update:model-value="toc = $event" />
      </div>

      <div v-if="supportsCss" class="grid grid-cols-[120px_1fr] items-center gap-2">
        <label class="text-xs text-muted-foreground">{{ t('documentOptions.css') }}</label>
        <Input
          :model-value="css"
          :placeholder="t('documentOptions.cssPlaceholder')"
          class="h-8 text-xs"
          @update:model-value="(v) => (css = String(v))"
        />
      </div>
    </div>
  </details>
</template>
