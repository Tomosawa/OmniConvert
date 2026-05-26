<script setup lang="ts">
import { Settings2 } from 'lucide-vue-next'
import { computed } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import type { MediaOptions } from '@/types/mediaOptions'
import {
  AUDIO_BITRATES,
  FRAME_RATES,
  SAMPLE_RATES,
  VIDEO_BITRATES,
  targetKind,
} from '@/utils/ffmpegArgs'

interface Props {
  modelValue: MediaOptions
  /** Lowercase target extension (drives video/audio panel visibility). */
  targetExt: string
}

const props = defineProps<Props>()
const emits = defineEmits<{
  'update:modelValue': [value: MediaOptions]
}>()

const { t } = useI18n()

function patch(partial: Partial<MediaOptions>): void {
  emits('update:modelValue', { ...props.modelValue, ...partial })
}

const isVideoTarget = computed(() => targetKind(props.targetExt) === 'video')

const audioBitrate = computed({
  get: () => props.modelValue.audioBitrate ?? '',
  set: (v: string) => patch({ audioBitrate: v || undefined }),
})

const videoBitrate = computed({
  get: () => props.modelValue.videoBitrate ?? '',
  set: (v: string) => patch({ videoBitrate: v || undefined }),
})

const sampleRate = computed({
  get: () => String(props.modelValue.sampleRate ?? ''),
  set: (v: string) => patch({ sampleRate: v ? Number(v) : undefined }),
})

const fps = computed({
  get: () => String(props.modelValue.fps ?? ''),
  set: (v: string) => patch({ fps: v ? Number(v) : undefined }),
})

const widthValue = computed({
  get: () => String(props.modelValue.resolution?.width ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const h = props.modelValue.resolution?.height ?? 0
    patch({ resolution: n > 0 && h > 0 ? { width: n, height: h } : undefined })
  },
})

const heightValue = computed({
  get: () => String(props.modelValue.resolution?.height ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const w = props.modelValue.resolution?.width ?? 0
    patch({ resolution: n > 0 && w > 0 ? { width: w, height: n } : undefined })
  },
})

const audioOnly = computed({
  get: () => props.modelValue.audioOnly ?? false,
  set: (v: boolean) => patch({ audioOnly: v }),
})
</script>

<template>
  <details class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <summary class="flex cursor-pointer select-none items-center gap-2 font-medium">
      <Settings2 class="h-4 w-4" />
      {{ t('mediaOptions.heading') }}
    </summary>

    <div class="mt-3 space-y-3 pt-1">
      <div class="grid grid-cols-[120px_1fr] items-center gap-2">
        <label class="text-xs text-muted-foreground">{{ t('mediaOptions.audioBitrate') }}</label>
        <Select v-model="audioBitrate">
          <SelectTrigger class="h-8 w-32 text-xs">
            <SelectValue :placeholder="t('mediaOptions.auto')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="b in AUDIO_BITRATES" :key="b" :value="b">{{ b }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-[120px_1fr] items-center gap-2">
        <label class="text-xs text-muted-foreground">{{ t('mediaOptions.sampleRate') }}</label>
        <Select v-model="sampleRate">
          <SelectTrigger class="h-8 w-32 text-xs">
            <SelectValue :placeholder="t('mediaOptions.auto')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="r in SAMPLE_RATES" :key="r" :value="String(r)">
              {{ r }} Hz
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <template v-if="isVideoTarget">
        <div class="grid grid-cols-[120px_1fr] items-center gap-2">
          <label class="text-xs text-muted-foreground">{{ t('mediaOptions.videoBitrate') }}</label>
          <Select v-model="videoBitrate">
            <SelectTrigger class="h-8 w-32 text-xs">
              <SelectValue :placeholder="t('mediaOptions.auto')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="b in VIDEO_BITRATES" :key="b" :value="b">{{ b }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-[120px_1fr] items-center gap-2">
          <label class="text-xs text-muted-foreground">{{ t('mediaOptions.fps') }}</label>
          <Select v-model="fps">
            <SelectTrigger class="h-8 w-32 text-xs">
              <SelectValue :placeholder="t('mediaOptions.auto')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="r in FRAME_RATES" :key="r" :value="String(r)">{{ r }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-[120px_1fr_8px_1fr] items-center gap-2">
          <label class="text-xs text-muted-foreground">{{ t('mediaOptions.resolution') }}</label>
          <Input
            type="number"
            min="0"
            :model-value="widthValue"
            :placeholder="t('mediaOptions.width')"
            class="h-8 text-xs"
            @update:model-value="(v) => (widthValue = String(v))"
          />
          <span class="text-center text-xs text-muted-foreground">×</span>
          <Input
            type="number"
            min="0"
            :model-value="heightValue"
            :placeholder="t('mediaOptions.height')"
            class="h-8 text-xs"
            @update:model-value="(v) => (heightValue = String(v))"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-xs text-muted-foreground">{{ t('mediaOptions.audioOnly') }}</label>
          <Switch :model-value="audioOnly" @update:model-value="audioOnly = $event" />
        </div>
      </template>
    </div>
  </details>
</template>
