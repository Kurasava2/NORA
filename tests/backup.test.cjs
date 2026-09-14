const test = require('node:test')
const assert = require('node:assert/strict')
const {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  createUniversalBackup,
  parseUniversalBackup,
  parseBackup
} = require('../electron/backup.cjs')

const sampleState = {
  version: 7,
  settings: { tolerance: 0, commander: 'Иванов И.И.', nullable: null },
  periods: [{ id: 'p1', reportMonth: '2026-09', statements: [] }],
  vehicleSettings: {},
  customVehicles: [{ id: 'custom_1', shortNo: '9001', model: 'Тест', reg: '9001АА', baseRate: 12.5, rateUnit: 'lMotohour', hasMotohours: true }],
  catalog: []
}

test('универсальный backup сохраняет данные и метаданные без потерь', () => {
  const text = createUniversalBackup(sampleState, { appVersion: '1.4.0', createdAt: '2026-09-13T00:00:00.000Z' })
  const parsed = parseUniversalBackup(text)
  assert.deepEqual(parsed.data, sampleState)
  assert.equal(parsed.meta.format, BACKUP_FORMAT)
  assert.equal(parsed.meta.backupFormatVersion, BACKUP_FORMAT_VERSION)
  assert.equal(parsed.meta.dataSchemaVersion, 7)
  assert.equal(parsed.meta.appVersion, '1.4.0')
  assert.equal(parsed.meta.verified, true)
})

test('backup format не привязан к версии приложения или версии схемы данных', () => {
  const futureState = { ...sampleState, version: 27, futureField: { value: 'сохраняется' } }
  const text = createUniversalBackup(futureState, { appVersion: '9.8.7' })
  const envelope = JSON.parse(text)
  assert.equal(envelope.backupFormatVersion, 1)
  assert.equal(envelope.dataSchemaVersion, 27)
  const parsed = parseUniversalBackup(text)
  assert.equal(parsed.data.version, 27)
  assert.equal(parsed.data.futureField.value, 'сохраняется')
})

test('изменение содержимого обнаруживается по SHA-256', () => {
  const envelope = JSON.parse(createUniversalBackup(sampleState, { appVersion: '1.4.0' }))
  envelope.data.settings.commander = 'Подменено'
  assert.throws(() => parseUniversalBackup(JSON.stringify(envelope)), /Контрольная сумма/)
})

test('более новый формат контейнера не открывается молча', () => {
  const envelope = JSON.parse(createUniversalBackup(sampleState, { appVersion: '1.4.0' }))
  envelope.backupFormatVersion = BACKUP_FORMAT_VERSION + 1
  assert.throws(() => parseUniversalBackup(JSON.stringify(envelope)), /более новый формат/)
})

test('старый JSON backup остаётся импортируемым', () => {
  const parsed = parseBackup(JSON.stringify(sampleState), '.json')
  assert.deepEqual(parsed.data, sampleState)
  assert.equal(parsed.meta.legacy, true)
  assert.equal(parsed.meta.dataSchemaVersion, 7)
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' }), '.json'), /не похож на резервную копию/, 'посторонний JSON должен быть отклонён')
})

test('.gsmbackup обязан быть универсальным контейнером, а не произвольным JSON', () => {
  assert.throws(() => parseBackup(JSON.stringify(sampleState), '.gsmbackup'), /не универсальная резервная копия/)
})
