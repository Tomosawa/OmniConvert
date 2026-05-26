/**
 * Conversion options for the Pandoc engine. Pandoc has dozens of flags;
 * we surface only the most useful and document the option-name mapping
 * to actual Pandoc CLI flags.
 */
export interface DocumentOptions {
  /** When true, emit a self-contained `--standalone` document. */
  standalone?: boolean
  /** When true, generate a table of contents (`--toc`). */
  toc?: boolean
  /** Optional CSS URL or path to embed (HTML / EPUB targets). */
  css?: string
}
