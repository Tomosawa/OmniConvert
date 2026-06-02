<script setup lang="ts">
import { AlertCircle, Check, Loader2 } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'
import { useWasmPreload } from '@/composables/useWasmPreload'

const { engines, totalPercent, totalLoadedMB, totalSizeMB, allReady, hasErrors, preload } =
  useWasmPreload()

// Auto-start preload on component mount
preload()
</script>

<template>
  <!-- Full-page centered loading state. Parent controls visibility via v-if. -->
  <div class="flex flex-col items-center justify-center py-20">
    <Loader2
      v-if="!hasErrors && !allReady"
      class="mb-6 h-10 w-10 animate-spin text-primary"
    />
    <AlertCircle
      v-else-if="hasErrors"
      class="mb-6 h-10 w-10 text-destructive"
    />

    <h2 class="mb-2 text-xl font-semibold">
      {{ hasErrors ? '引擎加载出现问题' : '正在加载转换引擎…' }}
    </h2>
    <p class="mb-6 text-sm text-muted-foreground">
      首次使用需要下载约 {{ totalSizeMB }} MB 的引擎文件，后续访问将自动从缓存加载
    </p>

    <!-- Progress bar (full width) -->
    <div class="w-full">
      <Progress
        :model-value="totalPercent"
        class="h-3"
      />
      <div class="mt-2 text-center text-sm tabular-nums text-muted-foreground">
        {{ totalLoadedMB }} MB / {{ totalSizeMB }} MB（{{ totalPercent }}%）
      </div>
    </div>

    <!-- Per-engine status chips -->
    <div class="mt-8 flex flex-wrap justify-center gap-4">
      <div
        v-for="eng in engines"
        :key="eng.key"
        class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
        :class="{
          'border-destructive/30 text-destructive': eng.state === 'error',
          'border-primary/30 text-foreground': eng.state === 'loading',
          'border-green-500/30 text-green-700 dark:text-green-400': eng.state === 'cached' || eng.state === 'done',
          'border-muted text-muted-foreground': eng.state === 'pending',
        }"
      >
        <!-- Status icon -->
        <Check
          v-if="eng.state === 'cached' || eng.state === 'done'"
          class="h-4 w-4"
        />
        <Loader2
          v-else-if="eng.state === 'loading'"
          class="h-4 w-4 animate-spin text-primary"
        />
        <AlertCircle
          v-else-if="eng.state === 'error'"
          class="h-4 w-4"
        />
        <span
          v-else
          class="inline-block h-2 w-2 rounded-full bg-muted-foreground/40"
        />

        <!-- Engine name + context -->
        <span class="font-medium">{{ eng.name }}</span>
        <span
          v-if="eng.state === 'loading'"
          class="tabular-nums text-muted-foreground"
        >{{ eng.percent }}%</span>
        <span
          v-else-if="eng.state === 'cached'"
          class="text-muted-foreground"
        >已就绪</span>
        <span
          v-else-if="eng.state === 'error'"
        >失败</span>
      </div>
    </div>
  </div>
</template>
