/**
 * Ambient module shims for third-party packages that don't ship .d.ts files.
 * Each composable casts to its own typed surface — this just stops TS from
 * complaining about the missing declarations.
 */

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
