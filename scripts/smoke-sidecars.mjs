import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getTargetTriple } from './prepare-sidecar-binaries.mjs'

// Exercise relocated engines, including ImageMagick's dynamically loaded
// PNG coder. Windows only uses bundled DLL directories and the system PATH.
const target = process.argv[2] || getTargetTriple()
const temporary = mkdtempSync(join(tmpdir(), 'omniconvert-sidecars-'))
try {
  let directory = temporary
  let runtime = join(temporary, 'sidecar-runtime')
  const suffix = process.platform === 'win32' ? '.exe' : ''
  if (process.platform === 'darwin') {
    const app = `src-tauri/target/${target}/release/bundle/macos/OmniConvert.app/Contents`
    directory = join(app, 'MacOS')
    runtime = join(app, 'Resources', 'sidecar-runtime')
  } else {
    for (const name of ['ffmpeg', 'magick', 'pandoc']) {
      cpSync(`src-tauri/binaries/${name}-${target}${suffix}`, join(directory, name + suffix))
    }
    if (process.platform === 'win32') cpSync('src-tauri/sidecar-runtime', runtime, { recursive: true })
  }
  const env = { ...process.env }
  if (process.platform === 'darwin') {
    env.MAGICK_CODER_MODULE_PATH = join(runtime, 'magick-modules')
    env.MAGICK_CONFIGURE_PATH = join(runtime, 'magick-config')
  } else if (process.platform === 'win32') {
    env.PATH = ['magick', 'ffmpeg', 'pandoc'].map(name => join(runtime, name)).concat(join(env.SystemRoot || 'C:\\Windows', 'System32')).join(';')
    env.MAGICK_HOME = join(runtime, 'magick')
    env.MAGICK_CONFIGURE_PATH = join(runtime, 'magick')
    const coders = join(runtime, 'magick', 'modules', 'coders')
    env.MAGICK_CODER_MODULE_PATH = existsSync(coders) ? coders : join(runtime, 'magick')
  }
  function run(name, args) {
    execFileSync(join(directory, name + suffix), args, { env, stdio: 'inherit' })
  }
  const image = join(temporary, 'test.png')
  const audio = join(temporary, 'test.wav')
  const input = join(temporary, 'test.md')
  const output = join(temporary, 'test.html')
  run('magick', ['-size', '2x2', 'xc:red', image])
  run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=duration=0.1', audio])
  writeFileSync(input, '# Sidecar smoke test\n')
  run('pandoc', [input, '-o', output])
  if (![image, audio, output].every(existsSync)) throw new Error('Missing conversion output')
  console.log('All three relocated sidecars converted a sample successfully')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
