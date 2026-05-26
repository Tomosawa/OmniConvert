<script setup lang="ts">
import { Archive, Download, Loader2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useZipPacker } from '@/composables/useZipPacker'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionTask } from '@/types/conversion'

const { t } = useI18n()
const store = useConversionStore()
const { completed } = storeToRefs(store)
const { pack } = useZipPacker()

const packing = ref(false)

function targetFileName(task: ConversionTask): string {
  const original = task.fileItem.detected.file.name
  const dot = original.lastIndexOf('.')
  const stem = dot > 0 ? original.slice(0, dot) : original
  return `${stem}.${task.targetFormat}`
}

function downloadOne(task: ConversionTask): void {
  if (!task.resultUrl) return
  const a = document.createElement('a')
  a.href = task.resultUrl
  a.download = targetFileName(task)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function downloadAll(): Promise<void> {
  if (completed.value.length === 0 || packing.value) return
  if (completed.value.length === 1) {
    downloadOne(completed.value[0]!)
    return
  }
  packing.value = true
  try {
    const entries = completed.value
      .filter((t) => t.resultBlob)
      .map((t) => ({ name: targetFileName(t), blob: t.resultBlob! }))
    const zipBlob = await pack(entries)
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `omniconvert-${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } finally {
    packing.value = false
  }
}

const isDisabled = computed(
  () => completed.value.length === 0 || packing.value || store.isAnyRunning,
)

const label = computed(() => {
  if (packing.value) return t('batch.packing')
  if (completed.value.length > 1) {
    return t('batch.downloadZip', { n: completed.value.length })
  }
  return t('batch.download')
})
</script>

<template>
  <div v-if="completed.length > 0" class="flex justify-end">
    <Button :disabled="isDisabled" class="gap-2" @click="downloadAll">
      <Loader2 v-if="packing" class="h-4 w-4 animate-spin" />
      <Archive v-else-if="completed.length > 1" class="h-4 w-4" />
      <Download v-else class="h-4 w-4" />
      {{ label }}
    </Button>
  </div>
</template>
