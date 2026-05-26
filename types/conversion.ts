import type { FileItem } from './file'

export type ConversionStatus = 'pending' | 'running' | 'success' | 'error'

export interface ConversionTask {
  id: string
  fileItem: FileItem
  /** Lowercase target format (e.g. 'png', 'mp3'). */
  targetFormat: string
  status: ConversionStatus
  /** 0-100. */
  progress: number
  /** Populated only when status === 'error'. */
  error?: string
  /** Populated only when status === 'success'. */
  resultBlob?: Blob
  /** Object URL of resultBlob (revoke on removal). */
  resultUrl?: string
  /** Wall-clock timing for analytics / history. */
  startedAt?: number
  completedAt?: number
}
