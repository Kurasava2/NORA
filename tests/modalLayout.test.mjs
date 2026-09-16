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

const scrollPerformanceCss = fs.readFileSync(
  new URL('../src/scrollPerformance.css', import.meta.url),
  'utf8',
)
const settingsModalSource = fs.readFileSync(
  new URL('../src/modals/SettingsModal.jsx', import.meta.url),
  'utf8',
)
const settingsCss = fs.readFileSync(new URL('../src/settings.css', import.meta.url), 'utf8')

test('performance mode optimizes every application scroll container', () => {
  for (const selector of [
    '.main-content',
    '.sidebar',
    '.modal-body',
    '.trip-modal-body',
    '.settings-pane',
    '.table-wrap',
    '.paper-preview',
    '.material-picker-grid',
    '.recovery-screen',
  ]) {
    assert.match(scrollPerformanceCss, new RegExp(selector.replace('.', '\\.')))
  }
  assert.match(scrollPerformanceCss, /contain:paint/)
  assert.match(scrollPerformanceCss, /scrollbar-gutter:stable/)
})

test('settings use section navigation instead of one scrolling wall', () => {
  assert.match(settingsModalSource, /SettingsNavigation/)
  assert.match(settingsModalSource, /activeSection === 'general'/)
  assert.match(settingsModalSource, /activeSection === 'behavior'/)
  assert.match(settingsModalSource, /activeSection === 'excel'/)
  assert.match(settingsModalSource, /activeSection === 'print'/)
  assert.match(settingsCss, /\.settings-pane\{[^}]*overflow:auto/)
})

const modalSource = fs.readFileSync(
  new URL('../src/components/ui/Modal.jsx', import.meta.url),
  'utf8',
)
const homeViewSource = fs.readFileSync(new URL('../src/views/HomeView.jsx', import.meta.url), 'utf8')
const periodViewSource = fs.readFileSync(new URL('../src/views/PeriodView.jsx', import.meta.url), 'utf8')
const periodModalSource = fs.readFileSync(new URL('../src/modals/PeriodModal.jsx', import.meta.url), 'utf8')
const dateControlSource = fs.readFileSync(
  new URL('../src/components/ui/DateControl.jsx', import.meta.url),
  'utf8',
)
const sidebarSource = fs.readFileSync(
  new URL('../src/components/AppSidebar.jsx', import.meta.url),
  'utf8',
)
const tripFooterSource = fs.readFileSync(
  new URL('../src/modals/trip/TripModalFooter.jsx', import.meta.url),
  'utf8',
)
const viewDataSource = fs.readFileSync(new URL('../src/lib/viewData.js', import.meta.url), 'utf8')

test('modals render through document body so scroll containment cannot trap them in workspace', () => {
  assert.match(modalSource, /createPortal\(modal, document\.body\)/)
})

test('period overview removes redundant chrome and lists older years first', () => {
  assert.doesNotMatch(homeViewSource, /локальная база/)
  assert.doesNotMatch(homeViewSource, /⇧ Создать месяц из книги/)
  assert.match(homeViewSource, />Создать новый период</)
  assert.match(viewDataSource, /Number\(firstYear\) - Number\(secondYear\)/)
})

test('period page keeps filters when returning from a statement and uses inflected counters', () => {
  assert.match(periodViewSource, /const periodUiState = new Map\(\)/)
  assert.match(periodViewSource, /pluralRu\(warningCount, \.\.\.RU_FORMS\.warning\)/)
  assert.doesNotMatch(periodViewSource, /контроль автопарка/)
})

test('period month picker is custom and date controls have no redundant weekday caption', () => {
  assert.match(periodModalSource, /ReportMonthPicker/)
  assert.doesNotMatch(periodModalSource, /type="month"/)
  assert.doesNotMatch(dateControlSource, /DATE_FORMATTER/)
})

test('sidebar and trip footer omit redundant branding and destructive duplicate action', () => {
  assert.doesNotMatch(sidebarSource, /brand-mark/)
  assert.doesNotMatch(sidebarSource, /РАСЧЁТНЫЕ ВЕДОМОСТИ ГСМ/)
  assert.doesNotMatch(tripFooterSource, />Удалить</)
})
