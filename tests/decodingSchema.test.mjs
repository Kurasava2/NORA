import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const defaults = fs.readFileSync(new URL('../src/lib/domain/defaults.js', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../src/lib/domain/migration.js', import.meta.url), 'utf8')
const model = fs.readFileSync(new URL('../src/lib/decodings/model.js', import.meta.url), 'utf8')

test('density decoding uses schema 11 and the unified application state', () => {
  assert.match(defaults, /STORAGE_VERSION\s*=\s*11/)
  assert.match(defaults, /densityMovements:\s*\[\]/)
  assert.match(defaults, /legacyDensityLots:\s*\[\]/)
  assert.match(migration, /state\.decoding\s*=\s*normalizeDecodingState\(state\.decoding\)/)
  assert.match(model, /densityLots/)
  assert.match(model, /legacyAllocations/)
})
