<script setup lang="ts">
import { CloudUpload, MousePointerClick } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useDropZone } from '@/composables/useDropZone'
import { cn } from '@/lib/utils'

interface Props {
  multiple?: boolean
  /** Visual hint only — actual filtering happens upstream after detection. */
  acceptHint?: string
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  acceptHint: '',
})

const emit = defineEmits<{
  files: [files: File[]]
}>()

const { t } = useI18n()
const dropTarget = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const { isOver } = useDropZone(dropTarget, {
  multiple: props.multiple,
  onFiles: (files) => emit('files', files),
})

function openPicker(): void {
  fileInput.value?.click()
}

function onPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const list = input.files
  if (!list || list.length === 0) return
  emit('files', Array.from(list))
  input.value = ''
}
</script>

<template>
  <div
    ref="dropTarget"
    :class="
      cn(
        'group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 px-6 py-12 text-center transition-colors',
        isOver
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'hover:border-primary/60 hover:bg-card/70',
      )
    "
  >
    <div
      :class="
        cn(
          'flex h-12 w-12 items-center justify-center rounded-full border bg-background text-primary transition-transform',
          isOver && 'scale-110',
        )
      "
    >
      <CloudUpload class="h-6 w-6" />
    </div>

    <div class="space-y-1">
      <p class="text-base font-medium">
        {{ isOver ? t('upload.dropHere') : t('upload.heading') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ t('upload.description') }}
      </p>
    </div>

    <Button variant="default" class="gap-2" @click="openPicker">
      <MousePointerClick class="h-4 w-4" />
      {{ t('upload.browse') }}
    </Button>

    <p class="text-xs text-muted-foreground">
      {{ acceptHint || t('upload.browseHint') }}
    </p>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :multiple="multiple"
      @change="onPicked"
    >
  </div>
</template>
