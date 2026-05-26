<script setup lang="ts">
import { Separator, type SeparatorProps } from 'reka-ui'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'horizontal',
  decorative: true,
})

const delegatedProps = computed(() => {
  const { class: _omit, ...rest } = props
  void _omit
  return rest
})
</script>

<template>
  <Separator
    v-bind="delegatedProps"
    :class="
      cn(
        'shrink-0 bg-border',
        props.orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full',
        props.class,
      )
    "
  />
</template>
