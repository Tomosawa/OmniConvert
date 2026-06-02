<script setup lang="ts">
import { Check, Loader2 } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'
import { useWasmPreload } from '@/composables/useWasmPreload'

const { engines, totalPercent, totalLoadedMB, totalSizeMB, allReady, preload } =
  useWasmPreload()

// Ensure preload is running (idempotent due to singleton guard)
preload()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-500 ease-in"
    leave-from-class="opacity-100 max-h-32"
    leave-to-class="opacity-0 max-h-0"
  >
    <div
      v-if="!allReady"
      class="mb-6 overflow-hidden rounded-lg border bg-card p-4"
    >
      <div class="flex items-center gap-3">
        <Loader2 class="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-foreground">
              {{ $t('wasm.inlineTitle') }}
            </span>
            <span class="tabular-nums text-muted-foreground">
              {{ totalLoadedMB }} / {{ totalSizeMB }} MB
            </span>
          </div>
          <Progress
            :model-value="totalPercent"
            class="mt-2 h-2"
          />
        </div>
      </div>

      <!-- Compact engine chips -->
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="eng in engines"
          :key="eng.key"
          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
          :class="{
            'bg-green-500/10 text-green-700 dark:text-green-400': eng.state === 'cached' || eng.state === 'done',
            'bg-primary/10 text-primary': eng.state === 'loading',
            'bg-muted text-muted-foreground': eng.state === 'pending',
            'bg-destructive/10 text-destructive': eng.state === 'error',
          }"
        >
          <Check
            v-if="eng.state === 'cached' || eng.state === 'done'"
            class="h-3 w-3"
          />
          <Loader2
            v-else-if="eng.state === 'loading'"
            class="h-3 w-3 animate-spin"
          />
          <span>{{ eng.name }}</span>
          <span v-if="eng.state === 'loading'" class="tabular-nums">{{ eng.percent }}%</span>
        </span>
      </div>
    </div>
  </Transition>
</template>
