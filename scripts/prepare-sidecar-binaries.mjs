#!/usr/bin/env node

/**
 * Prepare sidecar binaries for Tauri desktop build.
 *
 * Tauri expects binaries in `src-tauri/binaries/` with platform-specific
 * suffixes:
 *   - macOS ARM64:     <name>-aarch64-apple-darwin
 *   - macOS Intel:     <name>-x86_64-apple-darwin
 *   - Windows:         <name>-x86_64-pc-windows-msvc.exe
 *   - Linux:           <name>-x86_64-unknown-linux-gnu
 *
 * This script copies system-installed binaries (via Homebrew, apt, etc.)
 * into the correct location for the current platform.
 *
 * Usage: node scripts/prepare-sidecar-binaries.mjs
 */

import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BINARIES_DIR = join(__dirname, '..', 'src-tauri', 'binaries')

function getTargetTriple() {
  const arch = process.arch // 'arm64', 'x64'
  const platform = process.platform // 'darwin', 'win32', 'linux'

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin'
  }
  if (platform === 'win32') {
    return 'x86_64-pc-windows-msvc.exe'
  }
  if (platform === 'linux') {
    return 'x86_64-unknown-linux-gnu'
  }
  throw new Error(`Unsupported platform: ${platform}/${arch}`)
}

function findBinary(names) {
  for (const name of names) {
    try {
      const result = execSync(`which ${name}`, { encoding: 'utf-8' }).trim()
      if (result && existsSync(result)) {
        // Resolve symlinks to get the actual binary
        const real = execSync(`readlink -f ${result} 2>/dev/null || realpath ${result} 2>/dev/null || echo ${result}`, { encoding: 'utf-8' }).trim()
        if (existsSync(real)) return real
        return result
      }
    } catch {
      // not found, try next
    }
  }
  return null
}

function prepareBinary(name, searchNames) {
  const triple = getTargetTriple()
  const targetName = `${name}-${triple}`
  const targetPath = join(BINARIES_DIR, targetName)

  if (existsSync(targetPath)) {
    const stat = statSync(targetPath)
    console.log(`  ✓ ${targetName} already exists (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
    return true
  }

  const sourcePath = findBinary(searchNames)
  if (!sourcePath) {
    console.error(`  ✗ ${name}: not found in PATH (tried: ${searchNames.join(', ')})`)
    console.error(`    Install via: brew install ${name} (macOS) or apt install ${name} (Linux)`)
    return false
  }

  copyFileSync(sourcePath, targetPath)
  // Make executable
  execSync(`chmod +x "${targetPath}"`)
  // Remove macOS quarantine attribute so Gatekeeper doesn't block execution
  if (process.platform === 'darwin') {
    try { execSync(`xattr -d com.apple.quarantine "${targetPath}" 2>/dev/null`) } catch { /* ok */ }
  }

  const stat = statSync(targetPath)
  console.log(`  ✓ ${targetName} (${(stat.size / 1024 / 1024).toFixed(1)} MB) ← ${sourcePath}`)
  return true
}

// Ensure binaries directory exists
if (!existsSync(BINARIES_DIR)) {
  mkdirSync(BINARIES_DIR, { recursive: true })
}

console.log(`\nTarget triple: ${getTargetTriple()}`)
console.log(`Binaries dir:  ${BINARIES_DIR}\n`)

const binaries = [
  { name: 'ffmpeg', search: ['ffmpeg'] },
  { name: 'magick', search: ['magick', 'convert'] },
  { name: 'pandoc', search: ['pandoc'] },
]

let allOk = true
for (const bin of binaries) {
  const ok = prepareBinary(bin.name, bin.search)
  if (!ok) allOk = false
}

if (allOk) {
  console.log('\n✓ All sidecar binaries prepared.\n')
} else {
  console.error('\n✗ Some binaries are missing. Install them and re-run this script.\n')
  process.exit(1)
}
