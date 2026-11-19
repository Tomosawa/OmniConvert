import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const target = process.argv[2]
if (!target || !/^[a-z0-9_-]+$/.test(target)) throw new Error('A Rust target triple is required')
const destination = 'release-assets'
mkdirSync(destination, { recursive: true })
let count = 0
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.endsWith('.app')) collect(path)
    }
    else if (/\.(dmg|exe|msi|deb)$/.test(entry.name)) {
      copyFileSync(path, join(destination, entry.name))
      count++
    }
  }
}
collect(`src-tauri/target/${target}/release/bundle`)
if (!count) throw new Error('No installers were produced')
console.log(`Collected ${count} installer(s) for ${target}`)
