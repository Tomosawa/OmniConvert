import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

interface DropZoneOptions {
  /** When true, accept multi-file drops. Default true. */
  multiple?: boolean
  /** Restrict via `accept` mime/extension list. Empty array = no restriction. */
  accept?: readonly string[]
  /** Callback invoked once per drop with the (filtered) files. */
  onFiles?: (files: File[]) => void
}

/**
 * Native HTML5 drag-and-drop binding for an arbitrary element ref.
 *
 * The composable wires up the four DOM events with proper `preventDefault`
 * so the browser doesn't navigate away, tracks `isOver` state for visual
 * feedback, and surfaces the dropped files through both a callback and a
 * ref (`files`) for inspection.
 *
 * Mounts/unmounts are scoped to the component lifecycle, so callers don't
 * have to clean up anything.
 */
export function useDropZone(
  target: Ref<HTMLElement | null>,
  options: DropZoneOptions = {},
) {
  const { multiple = true, accept = [], onFiles } = options

  const isOver = ref(false)
  const files = ref<File[]>([])
  // depth counter avoids isOver flicker when dragging across nested children
  let depth = 0

  const onEnter = (event: DragEvent) => {
    event.preventDefault()
    depth++
    isOver.value = true
  }

  const onLeave = (event: DragEvent) => {
    event.preventDefault()
    depth = Math.max(0, depth - 1)
    if (depth === 0) isOver.value = false
  }

  const onOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    depth = 0
    isOver.value = false

    const list = event.dataTransfer?.files
    if (!list || list.length === 0) return

    let dropped = Array.from(list)
    if (!multiple) dropped = dropped.slice(0, 1)
    if (accept.length > 0) dropped = dropped.filter((f) => matchesAccept(f, accept))
    if (dropped.length === 0) return

    files.value = dropped
    onFiles?.(dropped)
  }

  onMounted(() => {
    const el = target.value
    if (!el) return
    el.addEventListener('dragenter', onEnter)
    el.addEventListener('dragleave', onLeave)
    el.addEventListener('dragover', onOver)
    el.addEventListener('drop', onDrop)
  })

  onBeforeUnmount(() => {
    const el = target.value
    if (!el) return
    el.removeEventListener('dragenter', onEnter)
    el.removeEventListener('dragleave', onLeave)
    el.removeEventListener('dragover', onOver)
    el.removeEventListener('drop', onDrop)
  })

  function reset(): void {
    files.value = []
  }

  return { isOver, files, reset }
}

function matchesAccept(file: File, accept: readonly string[]): boolean {
  for (const rule of accept) {
    const r = rule.trim().toLowerCase()
    if (!r) continue
    if (r.startsWith('.') && file.name.toLowerCase().endsWith(r)) return true
    if (r.endsWith('/*') && file.type.toLowerCase().startsWith(r.slice(0, -1))) return true
    if (file.type.toLowerCase() === r) return true
  }
  return false
}
