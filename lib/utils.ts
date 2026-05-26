import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names safely.
 * Used by shadcn-vue components — keep the signature stable.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
