/**
 * Ambient module shims for third-party packages that don't ship .d.ts files.
 * Each composable casts to its own typed surface — this just stops TS from
 * complaining about the missing declarations.
 */

/**
 * Virtual module injected by the pandoc-url Vite plugin. Resolves to the
 * hashed asset URL of pandoc.wasm at build time so the preload composable
 * can fetch it with progress tracking.
 */
declare module 'virtual:pandoc-wasm-url' {
  const url: string
  export default url
}

declare module 'pandoc-wasm' {
  export const convert: (
    options: Record<string, unknown>,
    stdin: string,
    files: Record<string, Blob | string>,
  ) => Promise<{
    stdout: string
    stderr: string
    warnings?: unknown[]
    files?: Record<string, Blob>
    mediaFiles?: Record<string, Blob>
  }>
  export const query: (options: Record<string, unknown>) => unknown
  export const pandoc: unknown
}

declare module 'pandoc-wasm/src/core.js' {
  export function createPandocInstance(wasmBinary: ArrayBuffer): Promise<{
    convert: (
      options: Record<string, unknown>,
      stdin: string,
      files: Record<string, Blob | string>,
    ) => Promise<{
      stdout: string
      stderr: string
      warnings?: unknown[]
      files?: Record<string, Blob>
      mediaFiles?: Record<string, Blob>
    }>
    query: (options: Record<string, unknown>) => unknown
    pandoc: unknown
  }>
}
