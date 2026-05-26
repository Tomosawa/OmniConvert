<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-200 dark:border-slate-800">
      <div class="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div class="font-semibold tracking-tight">OmniConvert</div>
        <nav class="text-sm text-slate-500 dark:text-slate-400">
          <span>v0.0.1 · Phase 0</span>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer
      class="border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400"
    >
      <div class="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <span>© 2026 OmniConvert</span>
        <span>Privacy-first local file converter</span>
      </div>
    </footer>
  </div>
</template>
