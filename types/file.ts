/**
 * High-level file category, derived from MIME or extension detection.
 * Phase 2 wires this to actual detection logic; placeholder here keeps
 * downstream stores type-stable.
 */
import type { MediaMetadata } from '@/types/mediaOptions'

export type FileCategory = 'image' | 'media' | 'document' | 'unknown'

export interface ImageDimensions {
  width: number
  height: number
}

export interface DetectedFile {
  file: File
  category: FileCategory
  mime: string
  ext: string
  magicMatch: boolean
  imageDimensions?: ImageDimensions
  mediaMetadata?: MediaMetadata
}

export interface FileItem {
  id: string
  detected: DetectedFile
  /** User-selected target format (empty until chosen). */
  targetFormat: string | null
  /** Per-engine options (image/media/document). Free-form bag — engines
   *  read only what they recognise. */
  options?: Record<string, unknown>
}
