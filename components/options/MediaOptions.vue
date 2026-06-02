<script setup lang="ts">
import { ChevronDown, ChevronRight, Link2, Link2Off, Settings2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import type { AudioChannelLayout, AudioCodec, AudioRateMode, MediaMetadata, MediaOptions, VideoCodec, VideoPreset, VideoProfile } from '@/types/mediaOptions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  FRAME_RATES,
  PIX_FMTS,
  RESOLUTION_PRESETS,
  VIDEO_BITRATES,
  VIDEO_CRF_RANGE,
  VIDEO_GOP_SIZES,
  VIDEO_PRESETS,
  codecSupportsVbr,
  formatSupportsBitDepth,
  formatSupportsBitrate,
  getAudioBitrates,
  getAudioChannelOptions,
  getAudioRateModes,
  getAudioVbrQualities,
  getAvailableAudioCodecs,
  getAvailableVideoCodecs,
  getBitDepths,
  getDefaultAudioCodec,
  getDefaultVideoCodec,
  getSampleRates,
  getVideoProfiles,
  targetKind,
} from '@/utils/ffmpegArgs'

interface Props {
  modelValue: MediaOptions
  targetExt: string
  mediaMetadata?: MediaMetadata
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
const availableVideoCodecs = computed(() => getAvailableVideoCodecs(props.targetExt))
const availableAudioCodecs = computed(() => getAvailableAudioCodecs(props.targetExt))

const videoCodec = computed({
  get: () => props.modelValue.videoCodec ?? '',
  set: (v: string) => {
    const updates: Partial<MediaOptions> = { videoCodec: (v || undefined) as VideoCodec | undefined }
    if (v && v !== 'copy') {
      const profiles = getVideoProfiles(v)
      if (profiles.length > 0 && props.modelValue.videoProfile && !profiles.includes(props.modelValue.videoProfile)) {
        updates.videoProfile = undefined
      }
    }
    patch(updates)
  },
})

const videoProfile = computed({
  get: () => props.modelValue.videoProfile ?? '',
  set: (v: string) => patch({ videoProfile: (v || undefined) as VideoProfile | undefined }),
})

const videoProfiles = computed(() => {
  const codec = props.modelValue.videoCodec || getDefaultVideoCodec(props.targetExt)
  return getVideoProfiles(codec)
})

const videoPreset = computed({
  get: () => props.modelValue.videoPreset ?? '',
  set: (v: string) => patch({ videoPreset: (v || undefined) as VideoPreset | undefined }),
})

const videoBitrate = computed({
  get: () => props.modelValue.videoBitrate ?? '',
  set: (v: string) => patch({ videoBitrate: v || undefined }),
})

const videoCrf = computed({
  get: () => props.modelValue.videoCrf !== undefined ? String(props.modelValue.videoCrf) : '',
  set: (v: string) => patch({ videoCrf: v !== '' ? Number(v) : undefined }),
})

const useCrf = computed({
  get: () => props.modelValue.videoCrf !== undefined,
  set: (v: boolean) => {
    if (v) {
      patch({ videoCrf: VIDEO_CRF_RANGE.default, videoBitrate: undefined })
    } else {
      patch({ videoCrf: undefined })
    }
  },
})

const videoGopSize = computed({
  get: () => props.modelValue.videoGopSize ? String(props.modelValue.videoGopSize) : '',
  set: (v: string) => patch({ videoGopSize: v ? Number(v) : undefined }),
})

const pixFmt = computed({
  get: () => props.modelValue.pixFmt ?? '',
  set: (v: string) => patch({ pixFmt: v || undefined }),
})

const fps = computed({
  get: () => String(props.modelValue.fps ?? ''),
  set: (v: string) => patch({ fps: v ? Number(v) : undefined }),
})

const enableAudio = computed({
  get: () => props.modelValue.enableAudio ?? true,
  set: (v: boolean) => patch({ enableAudio: v }),
})

const audioCodec = computed({
  get: () => props.modelValue.audioCodec ?? '',
  set: (v: string) => {
    const updates: Partial<MediaOptions> = { audioCodec: (v || undefined) as AudioCodec | undefined }
    if (v && v !== 'copy') {
      const modes = getAudioRateModes(v)
      if (props.modelValue.audioRateMode && !modes.includes(props.modelValue.audioRateMode)) {
        updates.audioRateMode = undefined
        updates.audioVbrQuality = undefined
      }
      const channels = getAudioChannelOptions(v)
      if (props.modelValue.audioChannels && !channels.includes(props.modelValue.audioChannels)) {
        updates.audioChannels = undefined
      }
    }
    patch(updates)
  },
})

const audioBitrate = computed({
  get: () => props.modelValue.audioBitrate ?? '',
  set: (v: string) => patch({ audioBitrate: v || undefined }),
})

const audioBitrates = computed(() => {
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  const fromCodec = getAudioBitrates(codec)
  if (fromCodec.length > 0) return fromCodec
  return getAudioBitrates(props.targetExt)
})

const audioRateMode = computed({
  get: () => props.modelValue.audioRateMode ?? 'cbr',
  set: (v: string) => {
    const updates: Partial<MediaOptions> = { audioRateMode: (v || undefined) as AudioRateMode | undefined }
    if (v !== 'vbr') {
      updates.audioVbrQuality = undefined
    }
    patch(updates)
  },
})

const audioRateModes = computed(() => {
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  return getAudioRateModes(codec)
})

const audioVbrQuality = computed({
  get: () => props.modelValue.audioVbrQuality !== undefined ? String(props.modelValue.audioVbrQuality) : '',
  set: (v: string) => patch({ audioVbrQuality: v !== '' ? Number(v) : undefined }),
})

const audioVbrQualities = computed(() => {
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  return getAudioVbrQualities(codec)
})

const audioChannels = computed({
  get: () => props.modelValue.audioChannels ?? '',
  set: (v: string) => patch({ audioChannels: (v || undefined) as AudioChannelLayout | undefined }),
})

const audioChannelOptions = computed(() => {
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  return getAudioChannelOptions(codec)
})

const sampleRate = computed({
  get: () => String(props.modelValue.sampleRate ?? ''),
  set: (v: string) => patch({ sampleRate: v ? Number(v) : undefined }),
})

const sampleRates = computed(() => getSampleRates(props.targetExt))

const bitDepth = computed({
  get: () => String(props.modelValue.bitDepth ?? ''),
  set: (v: string) => patch({ bitDepth: v ? Number(v) as 16 | 24 | 32 : undefined }),
})

const showBitDepth = computed(() => formatSupportsBitDepth(props.targetExt))
const bitDepths = computed(() => getBitDepths(props.targetExt))
const showAudioBitrate = computed(() => {
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  return codec !== 'flac' && !codec.startsWith('pcm_')
})
const showVbrQuality = computed(() => {
  const mode = props.modelValue.audioRateMode
  if (mode !== 'vbr') return false
  const codec = props.modelValue.audioCodec || getDefaultAudioCodec(props.targetExt)
  return codecSupportsVbr(codec)
})

const aspectLocked = ref(true)
const aspectRatio = computed(() => {
  const m = props.mediaMetadata
  if (m && m.width && m.height && m.width > 0 && m.height > 0) return m.width / m.height
  return 0
})

const widthValue = computed({
  get: () => String(props.modelValue.resolution?.width ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const resize = { ...props.modelValue.resolution, width: n > 0 ? n : undefined }
    if (n > 0 && aspectLocked.value && aspectRatio.value > 0) {
      resize.height = Math.round(n / aspectRatio.value)
    }
    patch({ resolution: resize.width && resize.height ? { width: resize.width, height: resize.height } : undefined })
  },
})

const heightValue = computed({
  get: () => String(props.modelValue.resolution?.height ?? ''),
  set: (raw: string | number) => {
    const n = Number(raw) || 0
    const resize = { ...props.modelValue.resolution, height: n > 0 ? n : undefined }
    if (n > 0 && aspectLocked.value && aspectRatio.value > 0) {
      resize.width = Math.round(n * aspectRatio.value)
    }
    patch({ resolution: resize.width && resize.height ? { width: resize.width, height: resize.height } : undefined })
  },
})

const hasResolution = computed(() => {
  const r = props.modelValue.resolution
  return r && (r.width || r.height)
})

function fillOriginal(): void {
  const m = props.mediaMetadata
  if (!m || !m.width || !m.height) return
  patch({ resolution: { width: m.width, height: m.height } })
}

function clearResolution(): void {
  patch({ resolution: undefined })
}

function applyPreset(preset: { width: number; height: number }): void {
  patch({ resolution: { width: preset.width, height: preset.height } })
}

const panelOpen = ref(false)
const videoSectionOpen = ref(false)
const audioSectionOpen = ref(false)

watch(
  () => props.mediaMetadata,
  (meta) => {
    if (meta && meta.width && meta.height && !hasResolution.value) {
      patch({ resolution: { width: meta.width, height: meta.height } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <button
      type="button"
      class="flex w-full cursor-pointer select-none items-center gap-2 font-medium"
      @click="panelOpen = !panelOpen"
    >
      <ChevronDown v-if="panelOpen" class="h-4 w-4 shrink-0" />
      <ChevronRight v-else class="h-4 w-4 shrink-0" />
      <Settings2 class="h-4 w-4 shrink-0" />
      {{ isVideoTarget ? t('mediaOptions.heading') : t('mediaOptions.audioHeading') }}
    </button>

    <div v-if="panelOpen" class="mt-3 space-y-4 pt-1">
      <!-- ===== VIDEO SECTION ===== -->
      <div v-if="isVideoTarget">
        <button
          type="button"
          class="mb-2 flex items-center gap-1 text-xs font-semibold text-foreground"
          @click="videoSectionOpen = !videoSectionOpen"
        >
          <ChevronDown v-if="videoSectionOpen" class="h-3.5 w-3.5" />
          <ChevronRight v-else class="h-3.5 w-3.5" />
          {{ t('mediaOptions.videoSection') }}
        </button>

        <div v-if="videoSectionOpen" class="space-y-3 pl-1">
          <!-- Video Codec -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.videoCodec') }}</label>
            <Select v-model="videoCodec">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in availableVideoCodecs" :key="c" :value="c">{{ c }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Video Profile -->
          <div v-if="videoProfiles.length > 0" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.videoProfile') }}</label>
            <Select v-model="videoProfile">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in videoProfiles" :key="p" :value="p">{{ p }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Video Preset -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.videoPreset') }}</label>
            <Select v-model="videoPreset">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in VIDEO_PRESETS" :key="p" :value="p">{{ p }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- CRF / Bitrate toggle -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.rateControl') }}</label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded px-2 py-0.5 text-xs transition-colors"
                :class="useCrf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
                @click="useCrf = true"
              >
                CRF
              </button>
              <button
                type="button"
                class="rounded px-2 py-0.5 text-xs transition-colors"
                :class="!useCrf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
                @click="useCrf = false"
              >
                {{ t('mediaOptions.bitrate') }}
              </button>
            </div>
          </div>

          <!-- CRF value -->
          <div v-if="useCrf" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">CRF</label>
            <div class="flex items-center gap-2">
              <Input
                type="number"
                :min="VIDEO_CRF_RANGE.min"
                :max="VIDEO_CRF_RANGE.max"
                :step="VIDEO_CRF_RANGE.step"
                :model-value="videoCrf"
                class="h-8 w-24 text-xs"
                @update:model-value="(v: string | number) => videoCrf = String(v)"
              />
              <span class="text-xs text-muted-foreground">(0-51, {{ t('mediaOptions.crfHint') }})</span>
            </div>
          </div>

          <!-- Video Bitrate -->
          <div v-if="!useCrf" class="grid grid-cols-[120px_1fr] items-center gap-2">
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

          <!-- GOP Size -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.gopSize') }}</label>
            <Select v-model="videoGopSize">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="g in VIDEO_GOP_SIZES" :key="g" :value="String(g)">{{ g }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Frame Rate -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.fps') }}</label>
            <Select v-model="fps">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in FRAME_RATES" :key="r" :value="String(r)">{{ r }} fps</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Pixel Format -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.pixFmt') }}</label>
            <Select v-model="pixFmt">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in PIX_FMTS" :key="p" :value="p">{{ p }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Resolution -->
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="text-xs text-muted-foreground">{{ t('mediaOptions.resolution') }}</label>
              <span v-if="mediaMetadata?.width && mediaMetadata?.height" class="text-xs text-muted-foreground">
                {{ t('mediaOptions.original') }}: {{ mediaMetadata.width }}×{{ mediaMetadata.height }}
              </span>
            </div>

            <!-- Resolution presets -->
            <div class="mb-2 flex flex-wrap gap-1.5">
              <button
                v-for="p in RESOLUTION_PRESETS"
                :key="p.label"
                type="button"
                class="rounded border px-2 py-0.5 text-xs transition-colors hover:bg-accent"
                :class="modelValue.resolution?.width === p.width && modelValue.resolution?.height === p.height ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'"
                @click="applyPreset(p)"
              >
                {{ p.label }}
              </button>
            </div>

            <div class="flex items-center gap-1.5">
              <Input
                type="number"
                min="1"
                :model-value="widthValue"
                :placeholder="t('mediaOptions.width')"
                class="h-8 flex-1 text-xs"
                @update:model-value="(v) => (widthValue = String(v))"
              />
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-accent"
                :title="aspectLocked ? t('mediaOptions.unlockAspect') : t('mediaOptions.lockAspect')"
                @click="aspectLocked = !aspectLocked"
              >
                <Link2 v-if="aspectLocked" class="h-3.5 w-3.5 text-primary" />
                <Link2Off v-else class="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <Input
                type="number"
                min="1"
                :model-value="heightValue"
                :placeholder="t('mediaOptions.height')"
                class="h-8 flex-1 text-xs"
                @update:model-value="(v) => (heightValue = String(v))"
              />
            </div>

            <div class="mt-1.5 flex gap-2">
              <button
                v-if="mediaMetadata?.width && mediaMetadata?.height"
                type="button"
                class="text-xs text-primary underline-offset-2 hover:underline"
                @click="fillOriginal"
              >
                {{ t('mediaOptions.resetToOriginal') }}
              </button>
              <button
                v-if="hasResolution"
                type="button"
                class="text-xs text-muted-foreground underline-offset-2 hover:underline"
                @click="clearResolution"
              >
                {{ t('mediaOptions.clearResolution') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== AUDIO SECTION ===== -->
      <div>
        <div class="mb-2 flex items-center gap-2">
          <button
            type="button"
            class="flex flex-1 items-center gap-1 text-xs font-semibold text-foreground"
            @click="audioSectionOpen = !audioSectionOpen"
          >
            <ChevronDown v-if="audioSectionOpen" class="h-3.5 w-3.5" />
            <ChevronRight v-else class="h-3.5 w-3.5" />
            {{ t('mediaOptions.audioSection') }}
          </button>
          <div v-if="isVideoTarget" class="flex items-center gap-2">
            <Switch :model-value="enableAudio" @update:model-value="enableAudio = $event" />
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.enableAudio') }}</label>
          </div>
        </div>

        <p v-if="isVideoTarget && !enableAudio" class="pl-5 text-xs text-muted-foreground/60">
          {{ t('mediaOptions.audioDisabled') }}
        </p>
        <div v-if="audioSectionOpen && (!isVideoTarget || enableAudio)" class="space-y-3 pl-1">
          <!-- Audio Codec -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.audioCodec') }}</label>
            <Select v-model="audioCodec">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in availableAudioCodecs" :key="c" :value="c">{{ c }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Rate Mode -->
          <div v-if="audioRateModes.length > 0" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.rateMode') }}</label>
            <Select v-model="audioRateMode">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in audioRateModes" :key="m" :value="m">{{ m.toUpperCase() }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Audio Bitrate (CBR/ABR) -->
          <div v-if="showAudioBitrate && audioRateMode !== 'vbr'" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.audioBitrate') }}</label>
            <Select v-model="audioBitrate">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="b in audioBitrates" :key="b" :value="b">{{ b }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- VBR Quality -->
          <div v-if="showVbrQuality" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.vbrQuality') }}</label>
            <Select v-model="audioVbrQuality">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="q in audioVbrQualities" :key="q" :value="String(q)">{{ q }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Sample Rate -->
          <div class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.sampleRate') }}</label>
            <Select v-model="sampleRate">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in sampleRates" :key="r" :value="String(r)">
                  {{ r >= 1000 ? `${r / 1000} kHz` : `${r} Hz` }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Bit Depth -->
          <div v-if="showBitDepth" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.bitDepth') }}</label>
            <Select v-model="bitDepth">
              <SelectTrigger class="h-8 w-32 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="d in bitDepths" :key="d" :value="String(d)">
                  {{ d }}-bit{{ d === 32 ? ' (float)' : '' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Channels -->
          <div v-if="audioChannelOptions.length > 0" class="grid grid-cols-[120px_1fr] items-center gap-2">
            <label class="text-xs text-muted-foreground">{{ t('mediaOptions.channels') }}</label>
            <Select v-model="audioChannels">
              <SelectTrigger class="h-8 w-40 text-xs">
                <SelectValue :placeholder="t('mediaOptions.auto')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="ch in audioChannelOptions" :key="ch" :value="ch">{{ t(`mediaOptions.channel_${ch}`) }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
