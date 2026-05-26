<script setup lang="ts">
import {
  ProgressIndicator,
  ProgressRoot,
  type ProgressRootProps,
} from 'reka-ui'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<ProgressRootProps & { class?: HTMLAttributes['class'] }>(),
  { modelValue: 0 },
)

const value = computed(() => props.modelValue ?? 0)
</script>

<template>
  <ProgressRoot
    v-bind="props"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', props.class)"
  >
    <ProgressIndicator
      class="h-full w-full flex-1 bg-primary transition-all duration-300"
      :style="`transform: translateX(-${100 - Number(value)}%)`"
    />
  </ProgressRoot>
</template>
