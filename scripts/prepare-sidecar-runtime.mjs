#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareBinaries } from './prepare-sidecar-binaries.mjs'

const tauri = fileURLToPath(new URL('../src-tauri/', import.meta.url))
const runtime = join(tauri, 'sidecar-runtime')
const { directory, target, sources } = prepareBinaries()
rmSync(runtime, { recursive: true, force: true })
mkdirSync(runtime, { recursive: true })
const bundle = {}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? files(path) : [path]
  })
}

if (process.platform === 'darwin') {
  const prefix = execFileSync('brew', ['--prefix', 'imagemagick'], { encoding: 'utf8' }).trim()
  const modulesRoot = join(prefix, 'lib', 'ImageMagick')
  const moduleVersion = readdirSync(modulesRoot).find(name => name.startsWith('modules-'))
  if (!moduleVersion) throw new Error('ImageMagick coder modules not found')
  cpSync(join(modulesRoot, moduleVersion, 'coders'), join(runtime, 'magick-modules'), { recursive: true, dereference: true })
  const brewPrefix = execFileSync('brew', ['--prefix'], { encoding: 'utf8' }).trim()
  const config = [join(prefix, 'etc', 'ImageMagick-7'), join(brewPrefix, 'etc', 'ImageMagick-7')].find(existsSync)
  if (!config) throw new Error('ImageMagick configuration directory not found')
  cpSync(config, join(runtime, 'magick-config'), { recursive: true, dereference: true })
  const executables = Object.keys(sources).map(name => join(directory, `${name}-${target}`))
  const coderFiles = files(join(runtime, 'magick-modules'))
  const modules = coderFiles.filter(path => path.endsWith('.so'))
  for (const archive of coderFiles.filter(path => path.endsWith('.la'))) {
    // libltdl reads .la before opening the adjacent .so. Clear the original
    // Homebrew paths so dlopen uses the relocated Mach-O dependencies.
    const metadata = readFileSync(archive, 'utf8').replace(/^(libdir|dependency_libs)=.*$/gm, "$1=''")
    chmodSync(archive, 0o644)
    writeFileSync(archive, metadata)
  }
  const libraries = join(runtime, 'lib')
  const args = ['-od', '-b', '-d', libraries, '-p', '@executable_path/../Resources/sidecar-runtime/lib/']
  for (const path of [...executables, ...modules]) {
    chmodSync(path, 0o755)
    args.push('-x', path)
  }
  execFileSync('dylibbundler', args, { stdio: 'inherit' })
  // install_name_tool invalidates the original Homebrew signatures.
  for (const path of [...executables, ...modules, ...files(libraries)]) {
    if (path.endsWith('.la')) continue
    execFileSync('codesign', ['--force', '--sign', '-', path], { stdio: 'inherit' })
    const dependencies = execFileSync('otool', ['-L', path], { encoding: 'utf8' })
    if (/\n\s+(\/opt\/homebrew\/|\/usr\/local\/)/.test(dependencies)) {
      throw new Error(`Unbundled Homebrew dependency in ${path}:\n${dependencies}`)
    }
  }
  bundle.resources = { 'sidecar-runtime/': 'sidecar-runtime/' }
  bundle.macOS = { signingIdentity: '-', entitlements: 'entitlements.ci.plist' }
} else if (process.platform === 'win32') {
  // Keep DLLs, ImageMagick coders and config together. CI supplies real
  // executable paths instead of Chocolatey's launcher shims.
  for (const [name, source] of Object.entries(sources)) {
    cpSync(dirname(source), join(runtime, name), { recursive: true, dereference: true })
  }
  bundle.resources = { 'sidecar-runtime/': 'sidecar-runtime/' }
} else {
  // Ship a .deb with engine dependencies; copying Ubuntu binaries alone
  // would omit their shared libraries and ImageMagick modules.
  bundle.linux = { deb: { depends: ['ffmpeg', 'imagemagick', 'pandoc'] } }
}

writeFileSync(join(tauri, 'tauri.ci.conf.json'), JSON.stringify({ bundle }, null, 2) + '\n')
console.log(`Prepared native runtime for ${target}`)
