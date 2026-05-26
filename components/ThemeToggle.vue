<script setup lang="ts">
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useThemeStore } from '@/stores/theme'
import type { ThemePreference } from '@/types/i18n'

const theme = useThemeStore()
const { t } = useI18n()

const items: { value: ThemePreference; key: 'light' | 'dark' | 'system' }[] = [
  { value: 'light', key: 'light' },
  { value: 'dark', key: 'dark' },
  { value: 'system', key: 'system' },
]

const triggerLabel = computed(() => t('theme.toggle'))
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        :aria-label="triggerLabel"
      >
        <Sun v-if="theme.resolved === 'light'" />
        <Moon v-else />
        <span class="sr-only">{{ triggerLabel }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in items"
        :key="item.value"
        @select="theme.setPreference(item.value)"
      >
        <Sun v-if="item.key === 'light'" />
        <Moon v-else-if="item.key === 'dark'" />
        <Monitor v-else />
        <span>{{ t(`theme.${item.key}`) }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
