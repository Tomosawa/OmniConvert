<script setup lang="ts">
import {
  AlertTriangle,
  FileImage,
  FileText,
  FileVideo,
  HelpCircle,
  X,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import DocumentOptionsPanel from '@/components/options/DocumentOptions.vue'
import ImageOptionsPanel from '@/components/options/ImageOptions.vue'
import MediaOptionsPanel from '@/components/options/MediaOptions.vue'
import LargeFileWarning from '@/components/LargeFileWarning.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFormatRecommend } from '@/composables/useFormatRecommend'
import { usePlatform } from '@/composables/usePlatform'
import { useConversionStore } from '@/stores/conversion'
import type { FileItem } from '@/types/file'
import type { DocumentOptions } from '@/types/documentOptions'
import type { ImageOptions } from '@/types/imageOptions'
import type { MediaOptions } from '@/types/mediaOptions'
import { formatBytes } from '@/utils/fileSize'

interface Props {
  item: FileItem
}

const props = defineProps<Props>()

const { t } = useI18n()
const config = useRuntimeConfig()
const store = useConversionStore()
const { isDesktop } = usePlatform()

const detected = computed(() => props.item.detected)
const detectedRef = computed(() => props.item.detected)
const { targets, defaultTarget } = useFormatRecommend(detectedRef)

const threshold = computed(() => Number(config.public.largeFileThreshold) || 0)
const isLarge = computed(() => !isDesktop.value && detected.value.file.size > threshold.value)

const previewUrl = ref<string | null>(null)

const LOSSY_TARGETS = new Set(['jpg', 'jpeg', 'webp'])
const qualityRelevant = computed(() =>
  LOSSY_TARGETS.has((props.item.targetFormat ?? '').toLowerCase()),
)

const imageOptions = computed<ImageOptions>(
  () => (props.item.options as ImageOptions | undefined) ?? {},
)

function updateImageOptions(value: ImageOptions): void {
  store.setItemOptions(props.item.id, value as Record<string, unknown>)
}

const mediaOptions = computed<MediaOptions>(
  () => (props.item.options as MediaOptions | undefined) ?? {},
)

function updateMediaOptions(value: MediaOptions): void {
  store.setItemOptions(props.item.id, value as Record<string, unknown>)
}

const documentOptions = computed<DocumentOptions>(
  () => (props.item.options as DocumentOptions | undefined) ?? {},
)

function updateDocumentOptions(value: DocumentOptions): void {
  store.setItemOptions(props.item.id, value as Record<string, unknown>)
}

watch(
  () => detected.value.file,
  (file, _old, onCleanup) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    if (detected.value.category === 'image' && file.size <= 8 * 1024 * 1024) {
      const url = URL.createObjectURL(file)
      previewUrl.value = url
      onCleanup(() => {
        URL.revokeObjectURL(url)
        if (previewUrl.value === url) previewUrl.value = null
      })
    }
  },
  { immediate: true },
)

watch(
  defaultTarget,
  (next) => {
    if (next && !props.item.targetFormat) {
      store.setTargetFormat(props.item.id, next)
    }
  },
  { immediate: true },
)

const targetValue = computed({
  get: () => props.item.targetFormat ?? '',
  set: (value: string) => {
    store.setTargetFormat(props.item.id, value || null)
  },
})

const CategoryIcon = computed(() => {
  switch (detected.value.category) {
    case 'image':
      return FileImage
    case 'media':
      return FileVideo
    case 'document':
      return FileText
    default:
      return HelpCircle
  }
})
</script>

<template>
  <Card class="overflow-hidden">
    <CardContent class="flex gap-4 p-4">
      <div
        class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50 text-muted-foreground"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          :alt="detected.file.name"
          class="h-full w-full object-cover"
        >
        <component :is="CategoryIcon" v-else class="h-7 w-7" />
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="detected.file.name">
              {{ detected.file.name }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{{ formatBytes(detected.file.size) }}</span>
              <span aria-hidden="true">·</span>
              <Badge variant="secondary" class="font-mono uppercase">
                {{ detected.ext || '?' }}
              </Badge>
              <Badge variant="outline">
                {{ t(`fileCard.category.${detected.category}`) }}
              </Badge>
              <LargeFileWarning v-if="isLarge" :size="detected.file.size">
                <Badge variant="warning" class="cursor-pointer gap-1">
                  <AlertTriangle class="h-3 w-3" />
                  {{ t('largeFile.badge') }}
                </Badge>
              </LargeFileWarning>
            </div>

            <p
              v-if="detected.ext && !detected.magicMatch"
              class="mt-1.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle class="h-3 w-3" />
              {{ t('fileCard.magicMismatch') }}
            </p>
            <p
              v-else-if="detected.category === 'unknown'"
              class="mt-1.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle class="h-3 w-3" />
              {{ t('fileCard.unknownFormat') }}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            :aria-label="t('fileCard.remove')"
            @click="store.removeItem(item.id)"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>

        <div v-if="targets.length > 0" class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ t('fileCard.convertTo') }}</span>
          <Select v-model="targetValue">
            <SelectTrigger class="h-8 w-32 text-xs">
              <SelectValue :placeholder="t('fileCard.selectTarget')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="target in targets"
                :key="target"
                :value="target"
                class="font-mono uppercase"
              >
                {{ target }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          {{ t('fileCard.noTargets') }}
        </p>

        <ImageOptionsPanel
          v-if="detected.category === 'image' && targets.length > 0"
          :model-value="imageOptions"
          :quality-relevant="qualityRelevant"
          :original-dimensions="detected.imageDimensions"
          @update:model-value="updateImageOptions"
        />

        <MediaOptionsPanel
          v-if="detected.category === 'media' && targets.length > 0 && item.targetFormat"
          :model-value="mediaOptions"
          :target-ext="item.targetFormat"
          @update:model-value="updateMediaOptions"
        />

        <DocumentOptionsPanel
          v-if="detected.category === 'document' && targets.length > 0 && item.targetFormat"
          :model-value="documentOptions"
          :target-ext="item.targetFormat"
          @update:model-value="updateDocumentOptions"
        />
      </div>
    </CardContent>
  </Card>
</template>
