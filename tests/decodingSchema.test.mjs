import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const defaults = fs.readFileSync(new URL('../src/lib/domain/defaults.js', import.meta.url), 'utf8')
const migration = fs.readFileSync(new URL('../src/lib/domain/migration.js', import.meta.url), 'utf8')

test('decoding data is part of schema 10 and the unified application state', () => {
  assert.match(defaults, /STORAGE_VERSION\s*=\s*10/)
  assert.match(defaults, /decoding:\s*\{\s*documents:\s*\[\]/)
  assert.match(migration, /state\.decoding\s*=\s*normalizeDecodingState\(state\.decoding\)/)
})
