<script setup lang="ts">
import { Languages } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/composables/useLocale'

const { current, available, switchTo, t } = useLocale()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        :aria-label="t('language.toggle')"
      >
        <Languages />
        <span class="sr-only">{{ t('language.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-[10rem]">
      <DropdownMenuItem
        v-for="loc in available"
        :key="loc.code"
        :class="{ 'font-semibold': loc.code === current }"
        @select="switchTo(loc.code)"
      >
        <span>{{ loc.name }}</span>
        <span
          v-if="loc.code === current"
          class="ml-auto text-xs text-muted-foreground"
        >✓</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
