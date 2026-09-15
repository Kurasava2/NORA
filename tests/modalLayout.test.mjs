import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const indexCss = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const usabilityCss = fs.readFileSync(new URL('../src/usability.css', import.meta.url), 'utf8')
const tripPerformanceCss = fs.readFileSync(
  new URL('../src/tripPerformance.css', import.meta.url),
  'utf8',
)

test('modal backdrop stays below titlebar and inside app viewport', () => {
  assert.match(usabilityCss, /\.modal-backdrop\{[^}]*top:var\(--titlebar-height\)/)
  assert.match(usabilityCss, /\.modal-backdrop\{[^}]*overflow:hidden/)
  assert.match(indexCss, /\.modal\{[^}]*max-height:100%/)
  assert.match(indexCss, /\.modal\{[^}]*max-width:100%/)
})

test('long modal forms scroll internally instead of escaping the window', () => {
  assert.match(indexCss, /\.modal>form\{[^}]*min-height:0[^}]*overflow:hidden/)
  assert.match(indexCss, /\.modal-body\{[^}]*overflow:auto/)
  assert.match(indexCss, /\.trip-modal-body\{[^}]*overflow:auto/)
  assert.doesNotMatch(indexCss, /\.trip-modal-form\{[^}]*max-height:calc\(100vh/)
})

test('trip modal performance mode avoids expensive scroll composition', () => {
  assert.match(tripPerformanceCss, /\.performance-mode \.trip-modal-backdrop\{[^}]*background:#05070c/)
  assert.match(tripPerformanceCss, /\.trip-modal-backdrop \.modal\{[^}]*box-shadow:none/)
  assert.match(tripPerformanceCss, /\.trip-modal-backdrop \.sticky-actions\{[^}]*position:static/)
  assert.match(tripPerformanceCss, /\.trip-modal-backdrop \.material-entry\{[^}]*contain:layout paint style/)
})
