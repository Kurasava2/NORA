import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(
  new URL('../src/lib/domain/tripPrefill.js', import.meta.url),
  'utf8',
)

test('new trip carries odometer start but leaves odometer end blank', () => {
  assert.match(source, /odoStart:\s*odometerStart/)
  assert.match(source, /odoEnd:\s*''/)
  assert.doesNotMatch(source, /odoEnd:\s*odometerStart/)
})
