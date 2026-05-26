<script setup lang="ts">
import { History, Loader2, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useHistory } from '@/composables/useHistory'
import type { HistoryRecord } from '@/composables/useHistory'
import { formatBytes } from '@/utils/fileSize'

const { t, locale } = useI18n()
const history = useHistory()

const records = ref<HistoryRecord[]>([])
const loading = ref(true)

useHead({ titleTemplate: () => `${t('nav.history')} · OmniConvert` })

async function refresh(): Promise<void> {
  loading.value = true
  try {
    records.value = await history.list(200)
  } finally {
    loading.value = false
  }
}

async function clearAll(): Promise<void> {
  await history.clear()
  records.value = []
}

async function removeOne(id: string): Promise<void> {
  await history.remove(id)
  records.value = records.value.filter((r) => r.id !== id)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(locale.value)
}

onMounted(refresh)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="mb-8 flex items-end justify-between">
      <div>
        <h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <History class="h-7 w-7" />
          {{ t('nav.history') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t('history.description') }}
        </p>
      </div>
      <Button
        v-if="records.length > 0"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="clearAll"
      >
        <Trash2 class="h-3.5 w-3.5" />
        {{ t('history.clearAll') }}
      </Button>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      {{ t('history.loading') }}
    </div>

    <Card v-else-if="records.length === 0">
      <CardContent class="p-8 text-center text-sm text-muted-foreground">
        {{ t('history.empty') }}
      </CardContent>
    </Card>

    <div v-else class="space-y-2">
      <Card v-for="r in records" :key="r.id">
        <CardContent class="flex items-center gap-4 p-4">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="r.fileName">
              {{ r.fileName }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary" class="font-mono uppercase">{{ r.sourceFormat }}</Badge>
              <span aria-hidden="true">→</span>
              <Badge variant="default" class="font-mono uppercase">{{ r.targetFormat }}</Badge>
              <Badge :variant="r.status === 'success' ? 'success' : 'destructive'">
                {{ t(`task.status.${r.status}`) }}
              </Badge>
              <span aria-hidden="true">·</span>
              <span>{{ formatBytes(r.sizeBytes) }}</span>
              <span v-if="r.outputBytes > 0" aria-hidden="true">→</span>
              <span v-if="r.outputBytes > 0">{{ formatBytes(r.outputBytes) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ formatDuration(r.durationMs) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ formatDate(r.completedAt) }}</span>
            </div>
            <p
              v-if="r.error"
              class="mt-1.5 text-xs text-destructive"
              :title="r.error"
            >
              {{ r.error }}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="shrink-0"
            @click="removeOne(r.id)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
