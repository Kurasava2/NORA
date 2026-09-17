import assert from 'node:assert/strict'
import test from 'node:test'
import { autoAllocateMaterial } from '../src/lib/decodings/allocations.js'
import { buildCarryMovements } from '../src/lib/decodings/balances.js'
import {
  decimalAdd,
  decimalMultiply,
  decimalSubtract,
} from '../src/lib/decodings/decimal.js'
import { normalizeDecodingState } from '../src/lib/decodings/model.js'
import { validateDecoding } from '../src/lib/decodings/validation.js'

function sourceRow(overrides = {}) {
  return {
    statementId: 's1',
    vehicleId: 'v1',
    vehicleShortNo: '2291',
    vehicleModel: 'КамАЗ',
    vehicleReg: '0000',
    materialName: 'ДТ "З"',
    lastWaybillNumber: '10',
    lastWaybillDate: '2026-04-20',
    start: 250,
    received: 600,
    surrendered: 0,
    spent: 500,
    end: 350,
    norm: 500,
    variance: 0,
    tripFlows: [{ tripId: 't1', date: '2026-04-20', number: '10', received: 600, spent: 500 }],
    ...overrides,
  }
}

function document(id, periodId, start, end, rows) {
  return {
    id,
    periodId,
    mode: 'form63',
    sourceSnapshot: { start, end, rows },
  }
}

function movement(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(),
    periodId: 'p1',
    vehicleId: 'v1',
    materialName: 'ДТ "З"',
    density: '0.827',
    liters: '100',
    date: '2026-04-01',
    waybillNumber: '',
    kind: 'opening',
    generated: false,
    ...overrides,
  }
}

test('decimal helpers keep exact density mass without early rounding', () => {
  assert.equal(decimalMultiply('300', '0.827'), '248.1')
  assert.equal(decimalAdd('248.1', '207.25'), '455.35')
  assert.equal(decimalSubtract('48.7', '0.2'), '48.5')
})

test('automatic density spending closes the smaller known balance first', () => {
  const row = sourceRow()
  const doc = document('d1', 'p1', '2026-04-01', '2026-04-30', [row])
  const state = normalizeDecodingState({
    densityMovements: [
      movement({ density: '0.820', liters: '250', kind: 'opening' }),
      movement({
        density: '0.833',
        liters: '600',
        kind: 'receipt',
        date: '2026-04-10',
        waybillNumber: '9',
      }),
    ],
  })
  const result = autoAllocateMaterial(state, doc, 'ДТ "З"')
  assert.equal(result.shortages.length, 0)
  assert.equal(result.allocations[0].density, '0.820')
  assert.equal(result.allocations[0].liters, '250')
  assert.equal(result.allocations[1].density, '0.833')
  assert.equal(result.allocations[1].liters, '250')
})

test('receipt cannot cover fuel spent before that receipt existed', () => {
  const row = sourceRow({
    start: 100,
    received: 500,
    spent: 150,
    end: 450,
    tripFlows: [{ tripId: 'early', date: '2026-04-05', number: '3', spent: 150 }],
  })
  const doc = document('d1', 'p1', '2026-04-01', '2026-04-30', [row])
  const state = normalizeDecodingState({
    densityMovements: [
      movement({ density: '0.827', liters: '100', kind: 'opening' }),
      movement({
        density: '0.833',
        liters: '500',
        kind: 'receipt',
        date: '2026-04-10',
        waybillNumber: '4',
      }),
    ],
  })
  const result = autoAllocateMaterial(state, doc, 'ДТ "З"')
  assert.equal(result.allocations.length, 1)
  assert.equal(result.allocations[0].liters, '100')
  assert.equal(result.shortages[0].liters, '50')
})

test('density carry skips months where that vehicle had no decoding row', () => {
  const marchRow = sourceRow({
    start: 100,
    received: 0,
    spent: 40,
    end: 60,
    tripFlows: [{ tripId: 'm1', date: '2026-03-10', number: '1', spent: 40 }],
  })
  const mayRow = sourceRow({ start: 60, received: 0, spent: 0, end: 60, tripFlows: [] })
  const march = document('march', 'pm', '2026-03-01', '2026-03-31', [marchRow])
  const april = document('april', 'pa', '2026-04-01', '2026-04-30', [])
  const may = document('may', 'py', '2026-05-01', '2026-05-31', [mayRow])
  const state = normalizeDecodingState({
    documents: [march, april, may],
    densityMovements: [
      movement({ periodId: 'pm', density: '0.827', liters: '100', date: '2026-03-01' }),
    ],
    allocations: [{
      id: 'a1',
      decodingId: 'march',
      statementId: 's1',
      vehicleId: 'v1',
      materialName: 'ДТ "З"',
      density: '0.827',
      liters: '40',
      kind: 'spent',
      source: 'auto',
    }],
  })
  const carry = buildCarryMovements(state, may)
  assert.equal(carry.length, 1)
  assert.equal(carry[0].liters, '60')
  assert.equal(carry[0].sourcePeriodId, 'pm')
})

test('validation reports receipt liters that are not decoded by density', () => {
  const row = sourceRow({ start: 0, received: 500, spent: 0, end: 500, tripFlows: [] })
  const doc = document('d1', 'p1', '2026-04-01', '2026-04-30', [row])
  const state = normalizeDecodingState({
    densityMovements: [
      movement({
        density: '0.833',
        liters: '400',
        kind: 'receipt',
        date: '2026-04-10',
        waybillNumber: '4',
      }),
    ],
  })
  const validation = validateDecoding(state, doc, 0.05)
  assert.equal(validation.ok, false)
  assert.match(validation.errors.join('\n'), /получение по раздаточной/i)
})

test('old party data is preserved as legacy instead of silently discarded', () => {
  const state = normalizeDecodingState({
    densityLots: [{ id: 'old-lot' }],
    allocations: [{ id: 'old-allocation', lotId: 'old-lot' }],
  })
  assert.equal(state.legacyDensityLots.length, 1)
  assert.equal(state.legacyAllocations.length, 1)
  assert.equal(state.allocations.length, 0)
})
