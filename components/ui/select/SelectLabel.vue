<script setup lang="ts">
import { SelectLabel, type SelectLabelProps, useForwardProps } from 'reka-ui'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _omit, ...rest } = props
  void _omit
  return rest
})

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <SelectLabel v-bind="forwarded" :class="cn('px-2 py-1.5 text-sm font-semibold', props.class)">
    <slot />
  </SelectLabel>
</template>
