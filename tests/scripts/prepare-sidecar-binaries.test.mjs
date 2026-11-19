import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findBinary, getTargetTriple } from '../../scripts/prepare-sidecar-binaries.mjs'

test('selects native targets and rejects unsupported architectures', () => {
  assert.equal(getTargetTriple('darwin', 'arm64'), 'aarch64-apple-darwin')
  assert.equal(getTargetTriple('darwin', 'x64'), 'x86_64-apple-darwin')
  assert.equal(getTargetTriple('win32', 'x64'), 'x86_64-pc-windows-msvc')
  assert.equal(getTargetTriple('linux', 'x64'), 'x86_64-unknown-linux-gnu')
  assert.throws(() => getTargetTriple('linux', 'arm64'), /Unsupported platform/)
})

test('finds an explicit executable path containing spaces without a shell', () => {
  const directory = mkdtempSync(join(tmpdir(), 'omniconvert engine '))
  try {
    const path = join(directory, 'example engine')
    writeFileSync(path, '')
    assert.equal(findBinary([], path), realpathSync(path))
    assert.equal(findBinary(['omniconvert-nonexistent-engine']), null)
    assert.throws(() => findBinary([], join(directory, 'missing')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
