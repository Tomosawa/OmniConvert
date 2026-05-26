<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import FileCard from '@/components/FileCard.vue'
import { Button } from '@/components/ui/button'
import { useConversionStore } from '@/stores/conversion'

const { t } = useI18n()
const store = useConversionStore()
const { items } = storeToRefs(store)
</script>

<template>
  <section v-if="items.length > 0" class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        {{ t('upload.selected', { count: items.length }) }}
      </p>
      <Button variant="ghost" size="sm" class="gap-2" @click="store.clearItems">
        <Trash2 class="h-3.5 w-3.5" />
        {{ t('upload.clearAll') }}
      </Button>
    </div>

    <div class="grid gap-3">
      <FileCard v-for="item in items" :key="item.id" :item="item" />
    </div>
  </section>
</template>
