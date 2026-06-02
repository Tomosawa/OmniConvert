#!/usr/bin/env node

/**
 * Generate placeholder Tauri app icons.
 * Creates simple colored PNG files at the required sizes.
 * Replace these with proper designed icons before release.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '..', 'src-tauri', 'icons')

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true })
}

/**
 * Create a minimal PNG file with a gradient icon.
 * Pure Node.js implementation — no external dependencies.
 */
function createPng(size) {
  // RGBA pixel data
  const pixels = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const cx = (x / size - 0.5) * 2
      const cy = (y / size - 0.5) * 2
      const dist = Math.sqrt(cx * cx + cy * cy)

      if (dist < 0.85) {
        // Inside circle: gradient from blue to purple
        const t = dist / 0.85
        const r = Math.round(59 + t * (139 - 59))   // #3B82F6 → #8B5CF6
        const g = Math.round(130 + t * (92 - 130))
        const b = Math.round(246 + t * (246 - 246))
        pixels[idx] = r
        pixels[idx + 1] = g
        pixels[idx + 2] = b
        pixels[idx + 3] = 255

        // Draw "OC" text area (simplified: white rectangle in center)
        if (Math.abs(cx) < 0.4 && Math.abs(cy) < 0.2) {
          pixels[idx] = 255
          pixels[idx + 1] = 255
          pixels[idx + 2] = 255
        }
      } else {
        // Outside circle: transparent
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
      }
    }
  }

  return encodePng(pixels, size, size)
}

/** Minimal PNG encoder */
function encodePng(pixels, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // IDAT: filter each row (filter byte 0 = none) then deflate
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0 // filter: none
    pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const compressed = deflateSync(rawData)

  // IEND chunk
  const chunks = [
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]

  return Buffer.concat([signature, ...chunks])
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeB = Buffer.from(type, 'ascii')
  const crc = crc32(Buffer.concat([typeB, data]))
  const crcB = Buffer.alloc(4)
  crcB.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeB, data, crcB])
}

/** CRC-32 for PNG chunks */
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// Generate icons at required sizes
const icons = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
  { name: 'Wide310x150Logo.png', size: 310 },
]

console.log('Generating placeholder icons...')
for (const icon of icons) {
  const path = join(ICONS_DIR, icon.name)
  const png = createPng(icon.size)
  writeFileSync(path, png)
  console.log(`  ✓ ${icon.name} (${icon.size}x${icon.size})`)
}

// For macOS .icns and Windows .ico, we'll create copies of the 512px icon
// Tauri's `tauri icon` command can generate proper .icns/.ico from a source PNG
// For now, create empty placeholder files
const icnsPath = join(ICONS_DIR, 'icon.icns')
const icoPath = join(ICONS_DIR, 'icon.ico')
if (!existsSync(icnsPath)) {
  writeFileSync(icnsPath, createPng(512)) // placeholder
  console.log('  ✓ icon.icns (placeholder — run `pnpm tauri icon` for proper format)')
}
if (!existsSync(icoPath)) {
  writeFileSync(icoPath, createPng(256)) // placeholder
  console.log('  ✓ icon.ico (placeholder — run `pnpm tauri icon` for proper format)')
}

console.log('\n✓ All icons generated. Replace with designed icons before release.\n')
