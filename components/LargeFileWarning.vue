<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatBytes } from '@/utils/fileSize'

interface Props {
  size: number
}

const props = defineProps<Props>()
const { t } = useI18n()
const config = useRuntimeConfig()

const thresholdLabel = computed(() => {
  const threshold = Number(config.public.largeFileThreshold) || 0
  return formatBytes(threshold, 0)
})

const sizeLabel = computed(() => formatBytes(props.size))
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle class="h-6 w-6" />
        </div>
        <DialogTitle class="text-center">{{ t('largeFile.title') }}</DialogTitle>
        <DialogDescription class="text-center">
          {{ t('largeFile.description', { threshold: thresholdLabel }) }}
        </DialogDescription>
        <p class="text-center text-xs text-muted-foreground">
          {{ sizeLabel }}
        </p>
      </DialogHeader>
      <DialogFooter class="sm:justify-center">
        <Button variant="outline">{{ t('largeFile.continue') }}</Button>
        <Button disabled :title="t('common.comingSoon')">{{ t('largeFile.downloadDesktop') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
