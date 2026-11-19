#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function getTargetTriple(platform = process.platform, arch = process.arch) {
  const targets = {
    'darwin/arm64': 'aarch64-apple-darwin',
    'darwin/x64': 'x86_64-apple-darwin',
    'win32/x64': 'x86_64-pc-windows-msvc',
    'linux/x64': 'x86_64-unknown-linux-gnu',
  }
  const target = targets[`${platform}/${arch}`]
  if (!target) throw new Error(`Unsupported platform: ${platform}/${arch}`)
  return target
}

export function findBinary(names, override) {
  if (override) return realpathSync(override)
  for (const name of names) {
    try {
      const candidates = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [name], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().split(/\r?\n/)
      const found = candidates.find(path => existsSync(path))
      if (found) return realpathSync(found)
    } catch { /* Try the next executable name. */ }
  }
  return null
}

export function prepareBinaries() {
  const directory = fileURLToPath(new URL('../src-tauri/binaries/', import.meta.url))
  mkdirSync(directory, { recursive: true })
  const target = getTargetTriple()
  const suffix = process.platform === 'win32' ? '.exe' : ''
  const sources = {}
  for (const [name, names] of Object.entries({ ffmpeg: ['ffmpeg'], magick: ['magick', 'convert'], pandoc: ['pandoc'] })) {
    const source = findBinary(names, process.env[`SIDECAR_${name.toUpperCase()}`])
    if (!source) throw new Error(`${name} not found. Install it or set SIDECAR_${name.toUpperCase()} to its executable path.`)
    const destination = join(directory, `${name}-${target}${suffix}`)
    copyFileSync(source, destination)
    if (process.platform !== 'win32') chmodSync(destination, 0o755)
    const args = name === 'pandoc' ? ['--version'] : ['-version']
    const version = execFileSync(destination, args, { encoding: 'utf8' }).split(/\r?\n/)[0]
    console.log(`${name}: ${version}`)
    sources[name] = source
  }
  return { directory, target, sources }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareBinaries()
}
