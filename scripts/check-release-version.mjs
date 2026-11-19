import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url)))
const cargo = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8')
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
const tag = process.env.GITHUB_REF_NAME
if (tag !== `v${config.version}` || cargoVersion !== config.version) {
  throw new Error(`Release versions must match: tag=${tag}, tauri=${config.version}, Cargo=${cargoVersion}`)
}
console.log(`Release version verified: ${tag}`)
