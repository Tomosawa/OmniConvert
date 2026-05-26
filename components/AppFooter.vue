<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="border-t bg-background">
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6">
      <span>{{ t('footer.copyright') }}</span>
      <span class="hidden sm:inline">{{ t('footer.tagline') }}</span>
    </div>
  </footer>
</template>
