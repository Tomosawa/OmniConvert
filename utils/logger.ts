type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function resolveMinLevel(): LogLevel {
  if (typeof window === 'undefined') return 'warn'
  try {
    const stored = localStorage.getItem('omniconvert:logLevel')
    if (stored && stored in LEVEL_ORDER) return stored as LogLevel
  } catch { /* localStorage may be blocked in some environments */ }
  if (import.meta.dev) return 'debug'
  return 'warn'
}

let minLevel: LogLevel = resolveMinLevel()

export function setLogLevel(level: LogLevel): void {
  minLevel = level
  try {
    localStorage.setItem('omniconvert:logLevel', level)
  } catch { /* localStorage may be blocked in some environments */ }
}

export function getLogLevel(): LogLevel {
  return minLevel
}

export function createLogger(tag: string) {
  const prefix = `[omni:${tag}]`

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
  }

  return {
    debug(...args: unknown[]): void {
      if (shouldLog('debug')) console.log(prefix, ...args)
    },
    info(...args: unknown[]): void {
      if (shouldLog('info')) console.info(prefix, ...args)
    },
    warn(...args: unknown[]): void {
      if (shouldLog('warn')) console.warn(prefix, ...args)
    },
    error(...args: unknown[]): void {
      if (shouldLog('error')) console.error(prefix, ...args)
    },
  }
}
