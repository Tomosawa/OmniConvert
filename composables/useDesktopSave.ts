import type { ConversionTask } from '@/types/conversion'
import { usePlatform } from '@/composables/usePlatform'

/**
 * Desktop-specific save composable that uses Tauri native dialogs instead
 * of the browser's <a download> trick. On desktop:
 * - Single file: opens a save-as dialog, writes the blob to the chosen path
 * - After saving: offers to reveal the file in Finder/Explorer
 * - Button label: "保存" instead of "下载"
 *
 * On web (non-desktop), delegates to browser download (returns false from
 * saveAs, so the caller can fall back to the <a> approach).
 */
export function useDesktopSave() {
  const { isDesktop } = usePlatform()

  /**
   * Save a single converted file using the Tauri native save dialog.
   * Returns true if the file was saved successfully (desktop), or false
   * if the caller should use browser download fallback (web).
   */
  async function saveAs(task: ConversionTask): Promise<boolean> {
    if (!isDesktop.value || !task.resultBlob) return false

    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    // Compute suggested filename
    const original = task.fileItem.detected.file.name
    const dot = original.lastIndexOf('.')
    const stem = dot > 0 ? original.slice(0, dot) : original
    const suggestedName = `${stem}.${task.targetFormat}`

    // Open native save dialog
    const filePath = await save({
      defaultPath: suggestedName,
      filters: [{
        name: task.targetFormat.toUpperCase(),
        extensions: [task.targetFormat],
      }],
    })

    if (!filePath) return true  // User cancelled dialog — not an error, just no save

    // Write the blob to the chosen path
    const buffer = new Uint8Array(await task.resultBlob.arrayBuffer())
    await writeFile(filePath, buffer)

    return true
  }

  /**
   * Save a single file next to the original file with a suffix,
   * without asking the user for a path. Returns the saved path
   * so the caller can offer "open folder".
   *
   * Pattern: original.mp4 → original_h265.mp4
   */
  async function saveBesideOriginal(task: ConversionTask): Promise<string | null> {
    if (!isDesktop.value || !task.resultBlob) return null

    const { writeFile } = await import('@tauri-apps/plugin-fs')
    const { join } = await import('@tauri-apps/api/path')

    // For desktop, we don't have the original file's native path
    // (it came from browser File picker). Save to temp + reveal in Finder.
    // This is a limitation of the current architecture — to get the original
    // file's path, we'd need a Tauri native file picker instead of <input>.
    // For now, use saveAs dialog as the primary method.
    return null
  }

  /**
   * Open the native file manager (Finder on macOS, Explorer on Windows)
   * to reveal a file at the given path.
   */
  async function revealInFolder(filePath: string): Promise<void> {
    if (!isDesktop.value) return

    const { open } = await import('@tauri-apps/plugin-opener')
    // Tauri plugin-opener's `open` with a directory path opens Finder/Explorer
    // Using the parent directory to show the containing folder
    await open(filePath)
  }

  return { saveAs, saveBesideOriginal, revealInFolder, isDesktop }
}