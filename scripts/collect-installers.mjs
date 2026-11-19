import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [target, platform] = process.argv.slice(2)
if (!target || !/^[a-z0-9_-]+$/.test(target)) throw new Error('A Rust target triple is required')
if (!['macOS', 'Windows', 'Linux'].includes(platform)) throw new Error('Expected platform: macOS, Windows, or Linux')
const destination = 'release-assets'
mkdirSync(destination, { recursive: true })
let count = 0
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.endsWith('.app')) collect(path)
    } else if (/\.(dmg|exe|msi|deb)$/.test(entry.name)) {
      const name = entry.name.replace(/^(OmniConvert_[^_]+)_/, `$1_${platform}_`)
      if (name === entry.name) throw new Error(`Unexpected installer filename: ${entry.name}`)
      copyFileSync(path, join(destination, name))
      count++
    }
  }
}
collect(`src-tauri/target/${target}/release/bundle`)
if (!count) throw new Error('No installers were produced')
console.log(`Collected ${count} installer(s) for ${target}`)
