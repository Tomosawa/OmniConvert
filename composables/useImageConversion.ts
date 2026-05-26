import { ref } from 'vue'
import type {
  ImageConvertRequest,
  ImageOptions,
  ImageWorkerOutbound,
} from '@/types/imageOptions'
import { uid } from '@/utils/fileSize'

interface ConvertArgs {
  file: File
  sourceExt: string
  targetExt: string
  options?: ImageOptions
  onProgress?: (progress: number) => void
}

interface PendingTask {
  resolve: (blob: Blob) => void
  reject: (err: Error) => void
  onProgress?: (progress: number) => void
  mime: string
}

let workerSingleton: Worker | null = null
const pending = new Map<string, PendingTask>()

function ensureWorker(): Worker {
  if (workerSingleton) return workerSingleton

  const worker = new Worker(
    new URL('@/workers/imageMagickWorker.ts', import.meta.url),
    { type: 'module' },
  )

  worker.addEventListener('message', (event: MessageEvent<ImageWorkerOutbound>) => {
    const msg = event.data
    if (msg.type === 'ready') return
    const task = pending.get(msg.id)
    if (!task) return

    if (msg.type === 'progress') {
      task.onProgress?.(msg.progress)
      return
    }
    if (msg.type === 'done') {
      pending.delete(msg.id)
      task.resolve(new Blob([msg.buffer], { type: task.mime || 'application/octet-stream' }))
      return
    }
    if (msg.type === 'error') {
      pending.delete(msg.id)
      task.reject(new Error(msg.message))
    }
  })

  worker.addEventListener('error', (event) => {
    for (const [id, task] of pending) {
      task.reject(new Error(event.message || 'Image worker crashed'))
      pending.delete(id)
    }
    // Drop the singleton so the next call respawns a fresh worker.
    workerSingleton = null
  })

  workerSingleton = worker
  return worker
}

/**
 * Hand-off to the ImageMagick Web Worker. Resolves with a Blob of the
 * converted image, rejects with the engine error message on failure.
 *
 * Phase 6 will plug this through `useConversionDispatcher`; for Phase 3
 * the page wires it directly so we can verify end-to-end.
 */
export function useImageConversion() {
  const isReady = ref(true)

  async function convert(args: ConvertArgs): Promise<Blob> {
    const worker = ensureWorker()
    const buffer = await args.file.arrayBuffer()
    const id = uid('img')
    const targetExt = args.targetExt.toLowerCase()
    const mimeByExt: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      ico: 'image/x-icon',
      heic: 'image/heic',
    }

    return new Promise<Blob>((resolve, reject) => {
      pending.set(id, {
        resolve,
        reject,
        onProgress: args.onProgress,
        mime: mimeByExt[targetExt] ?? 'application/octet-stream',
      })

      const req: ImageConvertRequest = {
        type: 'convert',
        id,
        buffer,
        sourceExt: args.sourceExt.toLowerCase(),
        targetExt,
        options: args.options ?? {},
      }
      worker.postMessage(req, [buffer])
    })
  }

  return { convert, isReady }
}
