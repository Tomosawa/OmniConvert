<script setup lang="ts">
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  FolderOpen,
  Loader2,
  RotateCw,
  Save,
  XCircle,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import ResultPreview from '@/components/ResultPreview.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDesktopSave } from '@/composables/useDesktopSave'
import { usePlatform } from '@/composables/usePlatform'
import { useZipPacker } from '@/composables/useZipPacker'
import { useConversionStore } from '@/stores/conversion'
import type { ConversionTask } from '@/types/conversion'
import { formatBytes } from '@/utils/fileSize'

const emit = defineEmits<{
  'new-task': []
}>()

const { t } = useI18n()
const store = useConversionStore()
const { tasks } = storeToRefs(store)
const { pack } = useZipPacker()
const { isDesktop } = usePlatform()
const desktopSave = useDesktopSave()

const packing = ref(false)
const savingTaskId = ref<string | null>(null)
// Track which tasks have been saved (desktop) so we can show "open folder" button
const savedPaths = ref<Map<string, string>>(new Map())

const completed = computed(() => store.completed)
const failed = computed(() => store.failed)

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

async function handleSaveOne(task: ConversionTask): Promise<void> {
  if (isDesktop.value) {
    savingTaskId.value = task.id
    try {
      const saved = await desktopSave.saveAs(task)
      if (saved) {
        // Mark as saved (we don't have the exact path since save dialog doesn't return it
        // in our current implementation, but the user got the dialog)
        // No path tracking needed — the dialog lets user choose location
      }
    } catch (err) {
      console.error('[StepResult] desktop save failed:', err)
      // Fall back to browser download on error
      downloadOne(task)
    } finally {
      savingTaskId.value = null
    }
  } else {
    downloadOne(task)
  }
}

async function downloadAll(): Promise<void> {
  if (completed.value.length === 0 || packing.value) return
  if (completed.value.length === 1) {
    await handleSaveOne(completed.value[0]!)
    return
  }

  if (isDesktop.value) {
    // Desktop batch: save each file individually via dialog
    for (const task of completed.value) {
      if (task.resultBlob) {
        await handleSaveOne(task)
      }
    }
    return
  }

  // Web batch: ZIP download
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

function retry(taskId: string): void {
  store.retry(taskId)
}

const allDone = computed(() => completed.value.length === tasks.value.length)
const hasSomeSuccess = computed(() => completed.value.length > 0)

// Button labels: desktop uses "保存", web uses "下载"
const saveLabel = computed(() => isDesktop.value ? t('task.save') : t('task.download'))
const saveAllLabel = computed(() => {
  if (isDesktop.value) {
    return completed.value.length > 1 ? t('task.saveAll') : t('task.save')
  }
  return completed.value.length > 1 ? t('batch.downloadZip', { n: completed.value.length }) : t('batch.download')
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <div class="flex items-center justify-center gap-2">
        <CheckCircle2 v-if="allDone" class="h-6 w-6 text-green-500" />
        <AlertTriangle v-else class="h-6 w-6 text-amber-500" />
        <span class="text-lg font-medium">
          {{ allDone ? t('convert.allDone') : t('convert.partialDone') }}
        </span>
      </div>
      <p class="mt-2 text-sm text-muted-foreground">
        {{ completed.length }} {{ t('convert.successCount') }}
        <span v-if="failed.length > 0" class="text-destructive">
          · {{ failed.length }} {{ t('convert.failedCount') }}
        </span>
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <Button
        v-if="hasSomeSuccess"
        class="gap-2"
        @click="downloadAll"
      >
        <Loader2 v-if="packing || savingTaskId" class="h-4 w-4 animate-spin" />
        <Archive v-else-if="completed.length > 1 && !isDesktop" class="h-4 w-4" />
        <Save v-else-if="isDesktop" class="h-4 w-4" />
        <Download v-else class="h-4 w-4" />
        {{ saveAllLabel }}
      </Button>
      <Button variant="outline" class="gap-2" @click="emit('new-task')">
        <RotateCw class="h-4 w-4" />
        {{ t('convert.newTask') }}
      </Button>
    </div>

    <div class="grid gap-3">
      <Card v-for="task in tasks" :key="task.id">
        <CardContent class="space-y-2 p-4">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" :title="targetFileName(task)">
                {{ targetFileName(task) }}
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
                <template v-if="task.resultBlob">
                  <span aria-hidden="true">·</span>
                  <span>{{ t('task.outputSize') }}: {{ formatBytes(task.resultBlob.size) }}</span>
                </template>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge
                v-if="task.status === 'success'"
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

          <p
            v-if="task.status === 'error'"
            class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {{ task.error || t('task.error.generic') }}
          </p>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button
              v-if="task.status === 'error'"
              size="sm"
              variant="outline"
              class="gap-2"
              @click="retry(task.id)"
            >
              <RotateCw class="h-3.5 w-3.5" />
              {{ t('task.retry') }}
            </Button>
            <Button
              v-if="task.status === 'success'"
              size="sm"
              class="gap-2"
              :disabled="savingTaskId === task.id"
              @click="handleSaveOne(task)"
            >
              <Loader2 v-if="savingTaskId === task.id" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else-if="isDesktop" class="h-3.5 w-3.5" />
              <Download v-else class="h-3.5 w-3.5" />
              {{ saveLabel }}
            </Button>
          </div>

          <ResultPreview
            v-if="task.status === 'success'"
            :task="task"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
