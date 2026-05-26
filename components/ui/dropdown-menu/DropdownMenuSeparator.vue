<script setup lang="ts">
import { DropdownMenuSeparator, type DropdownMenuSeparatorProps } from 'reka-ui'
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _omit, ...rest } = props
  void _omit
  return rest
})
</script>

<template>
  <DropdownMenuSeparator
    v-bind="delegatedProps"
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>
