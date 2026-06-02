<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useConversionStore } from '@/stores/conversion'
import { formatBytes } from '@/utils/fileSize'

const { t } = useI18n()
const store = useConversionStore()
const { tasks } = storeToRefs(store)

const summary = computed(() => ({
  total: store.total,
  done: store.successCount,
  failed: store.errorCount,
  running: store.running.length,
  pending: store.pending.length,
}))

const overallProgress = computed(() => {
  if (tasks.value.length === 0) return 0
  let total = 0
  for (const task of tasks.value) {
    if (task.status === 'success') total += 100
    else if (task.status === 'error') total += 100
    else if (task.status === 'cancelled') total += 100
    else total += task.progress
  }
  return Math.round(total / tasks.value.length)
})

function cancelTask(id: string) {
  store.cancelTask(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <div class="flex items-center justify-center gap-2">
        <Loader2 class="h-5 w-5 animate-spin text-primary" />
        <span class="text-lg font-medium">{{ t('convert.running') }}</span>
      </div>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ summary.done }} / {{ summary.total }}
        <span v-if="summary.failed > 0" class="text-destructive">
          · {{ t('task.failedCount', { n: summary.failed }) }}
        </span>
      </p>
    </div>

    <div class="mx-auto max-w-md">
      <Progress :model-value="overallProgress" class="h-3" />
      <p class="mt-1 text-center text-xs text-muted-foreground">{{ overallProgress }}%</p>
    </div>

    <div class="grid gap-3">
      <Card v-for="task in tasks" :key="task.id">
        <CardContent class="flex items-center gap-3 p-3">
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

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm" :title="task.fileItem.detected.file.name">
              {{ task.fileItem.detected.file.name }}
            </p>
            <div class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary" class="font-mono uppercase text-xs">
                {{ task.fileItem.detected.ext || '?' }}
              </Badge>
              <span aria-hidden="true">→</span>
              <Badge variant="default" class="font-mono uppercase text-xs">
                {{ task.targetFormat }}
              </Badge>
              <span aria-hidden="true">·</span>
              <span>{{ formatBytes(task.fileItem.detected.file.size) }}</span>
            </div>
          </div>

          <span v-if="task.status === 'running' || task.status === 'pending'" class="text-xs tabular-nums text-muted-foreground">
            {{ task.progress }}%
          </span>

          <Button
            v-if="task.status === 'running' || task.status === 'pending'"
            variant="ghost"
            size="icon"
            class="h-7 w-7 shrink-0"
            :title="t('task.cancel')"
            @click="cancelTask(task.id)"
          >
            <XCircle class="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>

        <div v-if="task.status === 'running' || task.status === 'pending'" class="px-3 pb-2">
          <Progress :model-value="task.progress" class="h-1.5" />
        </div>

        <p
          v-if="task.status === 'error'"
          class="px-3 pb-2 text-xs text-destructive"
        >
          {{ task.error || t('task.error.generic') }}
        </p>

        <p
          v-if="task.status === 'cancelled'"
          class="px-3 pb-2 text-xs text-muted-foreground"
        >
          {{ task.error || t('task.status.cancelled') }}
        </p>
      </Card>
    </div>
  </div>
</template>
