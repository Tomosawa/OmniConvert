<script setup lang="ts">
import UploadDropzone from '@/components/UploadDropzone.vue'

const emit = defineEmits<{
  files: [files: File[]]
}>()
</script>

<template>
  <div class="space-y-6">
    <UploadDropzone @files="(f: File[]) => emit('files', f)" />
  </div>
</template>
