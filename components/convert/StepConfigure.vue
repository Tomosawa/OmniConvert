<script setup lang="ts">
import {
  ArrowLeft,
  FileImage,
  FileText,
  FileVideo,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import DocumentOptionsPanel from '@/components/options/DocumentOptions.vue'
import ImageOptionsPanel from '@/components/options/ImageOptions.vue'
import MediaOptionsPanel from '@/components/options/MediaOptions.vue'
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
import { useConversionStore } from '@/stores/conversion'
import { useWasmPreload } from '@/composables/useWasmPreload'
import type { AcceptableValue } from 'reka-ui'
import type { FileCategory } from '@/types/file'
import type { DocumentOptions } from '@/types/documentOptions'
import type { ImageOptions } from '@/types/imageOptions'
import type { MediaOptions } from '@/types/mediaOptions'
import { recommendTargets } from '@/utils/formatTable'
import { formatBytes } from '@/utils/fileSize'

interface Props {
  canConvert: boolean
  eligibleCount: number
}

const _props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  start: []
  'add-files': [files: File[]]
}>()

const { t } = useI18n()
const store = useConversionStore()
const { items } = storeToRefs(store)
const { isEngineReady, enginePercent } = useWasmPreload()

/** Check if all required engines for the current file set are ready. */
const requiredCategories = computed(() => {
  const cats = new Set<FileCategory>()
  for (const item of items.value) {
    if (item.targetFormat && item.detected.category !== 'unknown') {
      cats.add(item.detected.category)
    }
  }
  return [...cats]
})

const allRequiredEnginesReady = computed(() =>
  requiredCategories.value.every((cat) => isEngineReady(cat)),
)

/** The lowest progress among required engines that are not yet ready. */
const pendingEnginePercent = computed(() => {
  const percents = requiredCategories.value
    .filter((cat) => !isEngineReady(cat))
    .map((cat) => enginePercent(cat))
  return percents.length > 0 ? Math.min(...percents) : 100
})

const showBatchPanel = ref(false)
const batchCategory = ref<FileCategory | ''>('')
const batchTargetFormat = ref('')
const batchImageOptions = ref<ImageOptions>({})
const batchMediaOptions = ref<MediaOptions>({})
const batchDocumentOptions = ref<DocumentOptions>({})

const batchFirstMediaMetadata = computed(() => {
  const first = batchCategoryItems.value.find((i) => i.detected.mediaMetadata)
  return first?.detected.mediaMetadata
})

const categories = computed(() => {
  const cats = new Set<FileCategory>()
  for (const item of items.value) {
    if (item.detected.category !== 'unknown') {
      cats.add(item.detected.category)
    }
  }
  return [...cats]
})

const batchCategoryItems = computed(() => {
  if (!batchCategory.value) return []
  return items.value.filter((i) => i.detected.category === batchCategory.value)
})

const batchTargets = computed(() => {
  if (!batchCategory.value) return []
  const allTargets = new Set<string>()
  for (const item of batchCategoryItems.value) {
    for (const t of recommendTargets(item.detected.ext)) {
      if (batchCategory.value === 'document' && t === item.detected.ext) continue
      allTargets.add(t)
    }
  }
  return [...allTargets].sort()
})

watch(batchCategory, () => {
  batchTargetFormat.value = ''
})

function applyBatchAll(): void {
  if (!batchCategory.value) return
  for (const item of batchCategoryItems.value) {
    if (batchTargetFormat.value) {
      const targets = recommendTargets(item.detected.ext)
      if (targets.includes(batchTargetFormat.value)) {
        store.setTargetFormat(item.id, batchTargetFormat.value)
      }
    }
    if (batchCategory.value === 'image') {
      store.setItemOptions(item.id, { ...batchImageOptions.value })
    } else if (batchCategory.value === 'media') {
      store.setItemOptions(item.id, { ...batchMediaOptions.value })
    } else if (batchCategory.value === 'document') {
      store.setItemOptions(item.id, { ...batchDocumentOptions.value })
    }
  }
}

const LOSSY_TARGETS = new Set(['jpg', 'jpeg', 'webp'])

function getCategoryIcon(cat: FileCategory) {
  switch (cat) {
    case 'image': return FileImage
    case 'media': return FileVideo
    case 'document': return FileText
    default: return HelpCircle
  }
}

function getTargets(ext: string, category?: string): string[] {
  const list = recommendTargets(ext)
  if (category === 'document') return list.filter((t) => t !== ext)
  return list
}

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker(): void {
  fileInput.value?.click()
}

function onPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const list = input.files
  if (!list || list.length === 0) return
  emit('add-files', Array.from(list))
  input.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        {{ t('upload.selected', { count: items.length }) }}
      </p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="gap-2" @click="showBatchPanel = !showBatchPanel">
          <Layers class="h-3.5 w-3.5" />
          {{ t('convert.batchSetting') }}
        </Button>
        <Button variant="ghost" size="sm" class="gap-2" @click="store.clearItems">
          <Trash2 class="h-3.5 w-3.5" />
          {{ t('upload.clearAll') }}
        </Button>
      </div>
    </div>

    <Card v-if="showBatchPanel" class="border-primary/30 bg-primary/5">
      <CardContent class="space-y-4 p-4">
        <div class="flex items-center gap-2 text-sm font-medium">
          <Layers class="h-4 w-4 text-primary" />
          {{ t('convert.batchSetting') }}
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ t('convert.batchCategory') }}</span>
          <Button
            v-for="cat in categories"
            :key="cat"
            :variant="batchCategory === cat ? 'default' : 'outline'"
            size="sm"
            class="gap-1.5"
            @click="batchCategory = cat"
          >
            <component :is="getCategoryIcon(cat)" class="h-3.5 w-3.5" />
            {{ t(`fileCard.category.${cat}`) }}
            <Badge variant="secondary" class="ml-1 text-xs">
              {{ items.filter(i => i.detected.category === cat).length }}
            </Badge>
          </Button>
        </div>

        <template v-if="batchCategory">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">{{ t('fileCard.convertTo') }}</span>
            <Select
              :model-value="batchTargetFormat"
              @update:model-value="(v: AcceptableValue) => nextTick(() => { batchTargetFormat = (v as string) || '' })"
            >
              <SelectTrigger class="h-8 w-36 text-xs">
                <SelectValue :placeholder="t('fileCard.selectTarget')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="target in batchTargets"
                  :key="target"
                  :value="target"
                  class="font-mono uppercase"
                >
                  {{ target }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ImageOptionsPanel
            v-if="batchCategory === 'image' && batchTargetFormat"
            :model-value="batchImageOptions"
            :quality-relevant="LOSSY_TARGETS.has(batchTargetFormat)"
            @update:model-value="batchImageOptions = $event"
          />

          <MediaOptionsPanel
            v-if="batchCategory === 'media' && batchTargetFormat"
            :model-value="batchMediaOptions"
            :target-ext="batchTargetFormat"
            :media-metadata="batchFirstMediaMetadata"
            @update:model-value="batchMediaOptions = $event"
          />

          <DocumentOptionsPanel
            v-if="batchCategory === 'document' && batchTargetFormat"
            :model-value="batchDocumentOptions"
            :target-ext="batchTargetFormat"
            @update:model-value="batchDocumentOptions = $event"
          />

          <div class="flex justify-end">
            <Button size="sm" class="gap-2" @click="applyBatchAll">
              <Wand2 class="h-3.5 w-3.5" />
              {{ t('convert.batchApply') }}
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>

    <div class="grid gap-3">
      <Card v-for="item in items" :key="item.id">
        <CardContent class="flex gap-4 p-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50 text-muted-foreground"
          >
            <component :is="getCategoryIcon(item.detected.category)" class="h-5 w-5" />
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium" :title="item.detected.file.name">
                  {{ item.detected.file.name }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{{ formatBytes(item.detected.file.size) }}</span>
                  <span aria-hidden="true">·</span>
                  <Badge variant="secondary" class="font-mono uppercase">
                    {{ item.detected.ext || '?' }}
                  </Badge>
                  <Badge variant="outline">
                    {{ t(`fileCard.category.${item.detected.category}`) }}
                  </Badge>
                </div>
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

            <div v-if="getTargets(item.detected.ext, item.detected.category).length > 0" class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">{{ t('fileCard.convertTo') }}</span>
              <Select
                :model-value="item.targetFormat ?? ''"
                @update:model-value="(v: AcceptableValue) => nextTick(() => store.setTargetFormat(item.id, (v as string) || null))"
              >
                <SelectTrigger class="h-8 w-32 text-xs">
                  <SelectValue :placeholder="t('fileCard.selectTarget')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="target in getTargets(item.detected.ext, item.detected.category)"
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
              v-if="item.detected.category === 'image' && item.targetFormat && getTargets(item.detected.ext, item.detected.category).length > 0"
              :model-value="(item.options as ImageOptions | undefined) ?? {}"
              :quality-relevant="LOSSY_TARGETS.has(item.targetFormat ?? '')"
              :original-dimensions="item.detected.imageDimensions"
              @update:model-value="(v) => store.setItemOptions(item.id, v as Record<string, unknown>)"
            />

            <MediaOptionsPanel
              v-if="item.detected.category === 'media' && item.targetFormat && getTargets(item.detected.ext, item.detected.category).length > 0"
              :model-value="(item.options as MediaOptions | undefined) ?? {}"
              :target-ext="item.targetFormat"
              :media-metadata="item.detected.mediaMetadata"
              @update:model-value="(v) => store.setItemOptions(item.id, v as Record<string, unknown>)"
            />

            <DocumentOptionsPanel
              v-if="item.detected.category === 'document' && item.targetFormat && getTargets(item.detected.ext, item.detected.category).length > 0"
              :model-value="(item.options as DocumentOptions | undefined) ?? {}"
              :target-ext="item.targetFormat"
              @update:model-value="(v) => store.setItemOptions(item.id, v as Record<string, unknown>)"
            />
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" class="gap-2" @click="openFilePicker">
        <Plus class="h-3.5 w-3.5" />
        {{ t('upload.addMore') }}
      </Button>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        multiple
        @change="onPicked"
      >
    </div>

    <div class="flex items-center justify-between border-t pt-4">
      <Button variant="ghost" class="gap-2" @click="emit('back')">
        <ArrowLeft class="h-4 w-4" />
        {{ t('convert.back') }}
      </Button>
      <Button
        :disabled="!canConvert || !allRequiredEnginesReady"
        class="gap-2"
        @click="emit('start')"
      >
        <Loader2
          v-if="canConvert && !allRequiredEnginesReady"
          class="h-4 w-4 animate-spin"
        />
        <Wand2 v-else class="h-4 w-4" />
        <template v-if="canConvert && !allRequiredEnginesReady">
          {{ t('wasm.engineLoading') }} {{ pendingEnginePercent }}%
        </template>
        <template v-else>
          {{ t('convert.start') }}
          <span v-if="eligibleCount > 0" class="text-xs opacity-80">
            ({{ eligibleCount }})
          </span>
        </template>
      </Button>
    </div>
  </div>
</template>
