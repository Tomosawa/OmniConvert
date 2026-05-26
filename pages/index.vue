<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-16">
    <h1 class="text-4xl font-bold tracking-tight">{{ t('app.name') }}</h1>
    <p class="mt-3 text-lg text-slate-600 dark:text-slate-300">
      {{ t('app.tagline') }}
    </p>

    <div class="mt-10 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ t('home.bootstrapNotice') }}
      </p>
    </div>
  </section>
</template>
