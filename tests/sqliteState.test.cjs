const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const {
  openDatabase,
  closeDatabase,
  get,
} = require('../electron/database/driver.cjs')
const { initializeSchema } = require('../electron/database/schema.cjs')
const { saveState, loadState } = require('../electron/database/repository.cjs')

function sampleState() {
  return {
    version: 11,
    settings: {
      unit: 'Тестовая часть',
      tolerance: 0.05,
      autosave: true,
      extraSetting: 'keep',
    },
    vehicleSettings: {
      v1: { customFlag: true },
    },
    vehicles: [{
      id: 'v1',
      shortNo: '2291',
      model: 'КАМАЗ',
      reg: '2291ВР',
      baseRate: 59,
      tankCapacity: null,
      normText: 'Норма',
      defaultMaterials: ['ДТ "З"'],
      hasMotohours: true,
      rateType: 'per100km',
      sourcePeriod: { startDay: 21, startMonth: 2, startYear: 2026 },
      autoCalc: {
        enabled: true,
        params: [{ id: 'p', code: 'ГРУЗ', label: 'Груз', defaultValue: '' }],
        rules: [],
      },
      extraVehicle: { preserved: true },
    }],
    catalog: [{
      id: 'gsm2',
      name: 'ДТ "З"',
      category: 'Топливо',
      unit: 'л',
      aliases: ['ДТ "З"'],
      sourceVehicles: ['v1'],
      sourceCount: 1,
      active: true,
      extraMaterial: 'keep',
    }],
    periods: [{
      id: 'period-1',
      start: '2026-05-01',
      end: '2026-05-31',
      reportMonth: '2026-05',
      extraPeriod: 7,
      statements: [{
        id: 'statement-1',
        vehicleId: 'v1',
        materials: ['ДТ "З"'],
        opening: {
          sourcePeriodId: 'period-0',
          odo: 1000,
          motohours: 20,
          gsm: { 'ДТ "З"': 100 },
        },
        createdAt: '2026-05-01T00:00:00.000Z',
        extraStatement: 'keep',
        trips: [{
          id: 'trip-1',
          seq: 1.25,
          listOrder: 0,
          date: '2026-05-03',
          number: '10',
          odoStart: '1000',
          odoEnd: 1010,
          motohoursStart: '20',
          motohoursEnd: 21.5,
          motohours: '',
          unused: false,
          note: 'тест',
          calcInputs: { ГРУЗ: '2.5' },
          autoCalcMeta: { source: 'auto' },
          extraTrip: ['keep'],
          gsm: {
            'ДТ "З"': {
              start: 100,
              received: '20',
              spent: 15,
              end: 105,
              _carried: true,
              _autoTarget: '',
              _calcSource: 'ТОПЛИВО',
              extraEntry: 'keep',
            },
          },
        }],
      }],
    }],
    decoding: {
      extraDecoding: 'keep',
      documents: [{
        id: 'decoding-1',
        periodId: 'period-1',
        mode: 'form63',
        status: 'draft',
        sourceSnapshot: {
          rows: [{ vehicleId: 'v1', materialName: 'ДТ "З"', end: 105 }],
        },
      }],
      densityMovements: [{
        id: 'movement-1',
        periodId: 'period-1',
        vehicleId: 'v1',
        materialName: 'ДТ "З"',
        density: '0.827',
        liters: '120',
        date: '2026-05-01',
        waybillNumber: '',
        kind: 'opening',
        generated: false,
      }],
      allocations: [{
        id: 'allocation-1',
        decodingId: 'decoding-1',
        statementId: 'statement-1',
        vehicleId: 'v1',
        materialName: 'ДТ "З"',
        density: '0.827',
        liters: '15',
        kind: 'spent',
        source: 'auto',
      }],
      containers: [{
        id: 'container-1',
        decodingId: 'decoding-1',
        materialName: 'ДТ "З"',
        type: 'бочка',
        quantityText: '1',
      }],
      legacyDensityLots: [{ id: 'old-lot', legacy: true }],
      legacyAllocations: [{ id: 'old-allocation', lotId: 'old-lot' }],
    },
    extraRoot: {
      unknownFutureField: true,
    },
  }
}

async function createTestDatabase() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-state-sqlite-'))
  const databasePath = path.join(directory, 'gsm-data.sqlite')
  const database = await openDatabase(databasePath)
  await initializeSchema(database)
  return { directory, database }
}

test('SQLite repository preserves the logical application state exactly', async () => {
  const { directory, database } = await createTestDatabase()
  const expectedState = sampleState()

  try {
    await saveState(database, expectedState)
    const actualState = await loadState(database)
    assert.deepEqual(actualState, expectedState)

    const vehicleCount = await get(database, 'SELECT COUNT(*) AS count FROM vehicles')
    const tripCount = await get(database, 'SELECT COUNT(*) AS count FROM trips')
    const materialCount = await get(
      database,
      'SELECT COUNT(*) AS count FROM trip_materials',
    )
    assert.equal(vehicleCount.count, 1)
    assert.equal(tripCount.count, 1)
    assert.equal(materialCount.count, 1)
  } finally {
    await closeDatabase(database)
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('failed SQLite save rolls back and preserves the previous state', async () => {
  const { directory, database } = await createTestDatabase()
  const expectedState = sampleState()

  try {
    await saveState(database, expectedState)
    const invalidState = sampleState()
    invalidState.extraRoot.circular = invalidState

    await assert.rejects(() => saveState(database, invalidState))
    assert.deepEqual(await loadState(database), expectedState)
  } finally {
    await closeDatabase(database)
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
