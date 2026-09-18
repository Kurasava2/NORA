const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const {
  createApplicationStore,
} = require('../electron/database/applicationStore.cjs')

function legacyState() {
  return {
    version: 11,
    settings: { autosave: true },
    periods: [],
    vehicleSettings: {},
    vehicles: [{
      id: 'v1',
      shortNo: '1',
      model: 'Тест',
      reg: '001',
    }],
    decoding: {
      documents: [],
      densityMovements: [],
      allocations: [],
      containers: [],
      legacyDensityLots: [],
      legacyAllocations: [],
    },
    catalog: [],
  }
}

test('legacy JSON is imported only after verified SQLite save', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-migration-'))
  const legacyJsonPath = path.join(directory, 'gsm-data.json')
  const databaseFilePath = path.join(directory, 'gsm-data.sqlite')
  const originalState = legacyState()
  const originalText = JSON.stringify(originalState)
  fs.writeFileSync(legacyJsonPath, originalText, 'utf8')

  const store = createApplicationStore({ databaseFilePath, legacyJsonPath })
  try {
    const legacyLoad = await store.load()
    assert.deepEqual(legacyLoad.data, originalState)
    assert.equal(legacyLoad.storage, 'legacy-json')
    assert.equal(legacyLoad.migrationRequired, true)

    await store.save(originalState, { verify: true })

    const sqlLoad = await store.load()
    assert.deepEqual(sqlLoad.data, originalState)
    assert.equal(sqlLoad.storage, 'sqlite')
    assert.equal(sqlLoad.migrationRequired, false)
    assert.equal(fs.readFileSync(legacyJsonPath, 'utf8'), originalText)
  } finally {
    await store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('SQLite state wins over a changed legacy JSON after migration', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-migration-'))
  const legacyJsonPath = path.join(directory, 'gsm-data.json')
  const databaseFilePath = path.join(directory, 'gsm-data.sqlite')
  const migratedState = legacyState()
  fs.writeFileSync(legacyJsonPath, JSON.stringify(migratedState), 'utf8')

  const firstStore = createApplicationStore({ databaseFilePath, legacyJsonPath })
  await firstStore.save(migratedState, { verify: true })
  await firstStore.close()

  fs.writeFileSync(
    legacyJsonPath,
    JSON.stringify({ ...migratedState, version: 999 }),
    'utf8',
  )

  const secondStore = createApplicationStore({ databaseFilePath, legacyJsonPath })
  try {
    const loaded = await secondStore.load()
    assert.deepEqual(loaded.data, migratedState)
    assert.equal(loaded.storage, 'sqlite')
  } finally {
    await secondStore.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
