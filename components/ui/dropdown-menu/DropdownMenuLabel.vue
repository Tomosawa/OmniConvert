<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'reka-ui'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>()

const delegatedProps = computed(() => {
  const { class: _omit, inset: _inset, ...rest } = props
  void _omit
  void _inset
  return rest
})
</script>

<template>
  <DropdownMenuLabel
    v-bind="delegatedProps"
    :class="cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>
