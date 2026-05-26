/**
 * High-level file category, derived from MIME or extension detection.
 * Phase 2 wires this to actual detection logic; placeholder here keeps
 * downstream stores type-stable.
 */
export type FileCategory = 'image' | 'media' | 'document' | 'unknown'

export interface DetectedFile {
  /** Original browser File handle. */
  file: File
  category: FileCategory
  /** MIME type as resolved by detection (best-effort, may be empty). */
  mime: string
  /** Lowercase extension without leading dot. */
  ext: string
  /** Whether the magic-number probe matched the extension. */
  magicMatch: boolean
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
