<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RotateCw,
  Trash2,
  XCircle,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import ResultPreview from '@/components/ResultPreview.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionTask } from '@/types/conversion'
import { formatBytes } from '@/utils/fileSize'

const { t } = useI18n()
const store = useConversionStore()
const { tasks } = storeToRefs(store)

function targetFileName(task: ConversionTask): string {
  const original = task.fileItem.detected.file.name
  const dot = original.lastIndexOf('.')
  const stem = dot > 0 ? original.slice(0, dot) : original
  return `${stem}.${task.targetFormat}`
}

function download(task: ConversionTask): void {
  if (!task.resultUrl) return
  const a = document.createElement('a')
  a.href = task.resultUrl
  a.download = targetFileName(task)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const summary = computed(() => ({
  total: store.total,
  done: store.successCount,
  failed: store.errorCount,
  running: store.running.length,
}))
</script>

<template>
  <section v-if="tasks.length > 0" class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">
        {{ t('task.heading') }}
        <span class="ml-2 text-xs text-muted-foreground">
          {{ summary.done }}/{{ summary.total }}
          <span v-if="summary.failed > 0" class="text-destructive">
            · {{ t('task.failedCount', { n: summary.failed }) }}
          </span>
        </span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        class="gap-2"
        :disabled="store.isAnyRunning"
        @click="store.clearTasks"
      >
        <Trash2 class="h-3.5 w-3.5" />
        {{ t('task.clear') }}
      </Button>
    </div>

    <Card v-for="task in tasks" :key="task.id">
      <CardContent class="space-y-2 p-4">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="task.fileItem.detected.file.name">
              {{ task.fileItem.detected.file.name }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary" class="font-mono uppercase">
                {{ task.fileItem.detected.ext || '?' }}
              </Badge>
              <span aria-hidden="true">→</span>
              <Badge variant="default" class="font-mono uppercase">
                {{ task.targetFormat }}
              </Badge>
              <span aria-hidden="true">·</span>
              <span>{{ formatBytes(task.fileItem.detected.file.size) }}</span>
              <span v-if="task.resultBlob" aria-hidden="true">·</span>
              <span v-if="task.resultBlob">
                {{ t('task.outputSize') }}: {{ formatBytes(task.resultBlob.size) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge
              v-if="task.status === 'pending'"
              variant="outline"
              class="gap-1 text-xs"
            >
              {{ t('task.status.pending') }}
            </Badge>
            <Badge
              v-else-if="task.status === 'running'"
              variant="secondary"
              class="gap-1 text-xs"
            >
              <Loader2 class="h-3 w-3 animate-spin" />
              {{ t('task.status.running') }}
            </Badge>
            <Badge
              v-else-if="task.status === 'success'"
              variant="success"
              class="gap-1 text-xs"
            >
              <CheckCircle2 class="h-3 w-3" />
              {{ t('task.status.success') }}
            </Badge>
            <Badge
              v-else-if="task.status === 'error'"
              variant="destructive"
              class="gap-1 text-xs"
            >
              <AlertTriangle class="h-3 w-3" />
              {{ t('task.status.error') }}
            </Badge>
            <Badge
              v-else-if="task.status === 'cancelled'"
              variant="outline"
              class="gap-1 text-xs"
            >
              <XCircle class="h-3 w-3" />
              {{ t('task.status.cancelled') }}
            </Badge>
          </div>
        </div>

        <Progress
          v-if="task.status === 'running' || task.status === 'pending'"
          :model-value="task.progress"
        />

        <p
          v-if="task.status === 'error'"
          class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {{ task.error || t('task.error.generic') }}
        </p>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button
            v-if="task.status === 'running' || task.status === 'pending'"
            size="sm"
            variant="ghost"
            class="gap-2"
            :title="t('task.cancel')"
            @click="store.cancelTask(task.id)"
          >
            <XCircle class="h-3.5 w-3.5" />
          </Button>
          <Button
            v-if="task.status === 'error'"
            size="sm"
            variant="outline"
            class="gap-2"
            @click="store.retry(task.id)"
          >
            <RotateCw class="h-3.5 w-3.5" />
            {{ t('task.retry') }}
          </Button>
          <Button
            v-if="task.status === 'success'"
            size="sm"
            class="gap-2"
            @click="download(task)"
          >
            <Download class="h-3.5 w-3.5" />
            {{ t('task.download') }}
          </Button>

          <img
            v-if="task.status === 'success' && task.fileItem.detected.category === 'image' && task.resultUrl"
            :src="task.resultUrl"
            :alt="targetFileName(task)"
            class="h-12 w-12 rounded-md border object-cover"
          >
        </div>

        <ResultPreview
          v-if="task.status === 'success' && task.fileItem.detected.category === 'media'"
          :task="task"
        />
      </CardContent>
    </Card>
  </section>
</template>
