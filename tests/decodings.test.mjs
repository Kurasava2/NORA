import assert from 'node:assert/strict'
import test from 'node:test'
import {
  autoAllocateMaterial,
  distributedLiters,
  lotRemaining,
  manualRowAllocations,
} from '../src/lib/decodings/allocations.js'
import {
  decimalAdd,
  decimalMultiply,
  decimalSubtract,
} from '../src/lib/decodings/decimal.js'
import { validateDecoding } from '../src/lib/decodings/validation.js'

function sourceRow(overrides = {}) {
  return {
    statementId: 's1',
    vehicleId: 'v1',
    vehicleShortNo: '2291',
    vehicleModel: 'КамАЗ',
    vehicleReg: '0000',
    materialName: 'ДТ З',
    lastWaybillNumber: '10',
    lastWaybillDate: '2026-04-12',
    start: 100,
    received: 500,
    surrendered: 0,
    spent: 550,
    end: 50,
    norm: 550,
    variance: 0,
    ...overrides,
  }
}

function document(rows = [sourceRow()]) {
  return {
    id: 'd1',
    sourceSnapshot: {
      start: '2026-04-01',
      end: '2026-04-30',
      rows,
    },
  }
}

function decodingState(overrides = {}) {
  return {
    densityLots: [
      {
        id: 'old',
        materialName: 'ДТ З',
        density: '0.827',
        volumeLiters: '300',
        date: '2026-03-20',
        createdAt: '2026-03-20T00:00:00Z',
      },
      {
        id: 'new',
        materialName: 'ДТ З',
        density: '0.829',
        volumeLiters: '300',
        date: '2026-04-10',
        createdAt: '2026-04-10T00:00:00Z',
      },
    ],
    allocations: [],
    containers: [],
    documents: [],
    ...overrides,
  }
}

test('decimal helpers keep exact density mass without early rounding', () => {
  assert.equal(decimalMultiply('300', '0.827'), '248.1')
  assert.equal(decimalMultiply('250', '0.829'), '207.25')
  assert.equal(decimalAdd('248.1', '207.25'), '455.35')
  assert.equal(decimalSubtract('48.7', '0.2'), '48.5')
})

test('FIFO spends the oldest lot first and preserves the exact carry remainder', () => {
  const result = autoAllocateMaterial(decodingState(), document(), 'ДТ З')
  const state = decodingState({ allocations: result.allocations })
  assert.equal(result.shortages.length, 0)
  assert.equal(result.allocations[0].lotId, 'old')
  assert.equal(result.allocations[0].liters, '300')
  assert.equal(result.allocations[1].lotId, 'new')
  assert.equal(result.allocations[1].liters, '250')
  assert.equal(lotRemaining(state, 'new'), '50')
})

test('manual density split has priority over repeated FIFO', () => {
  const row = sourceRow()
  const doc = document([row])
  const manual = manualRowAllocations(doc, row, { old: '100' })
  const state = decodingState({ allocations: manual })
  const result = autoAllocateMaterial(state, doc, 'ДТ З')
  const manualAfter = result.allocations.find(allocation => allocation.source === 'manual')
  assert.equal(manualAfter.liters, '100')
  assert.equal(distributedLiters({ ...state, allocations: result.allocations }, doc.id, row), '550')
})

test('validation reports an undistributed source amount', () => {
  const row = sourceRow({ spent: 550, end: 50 })
  const doc = document([row])
  const manual = manualRowAllocations(doc, row, { old: '300', new: '150' })
  const state = decodingState({ allocations: manual })
  const validation = validateDecoding(state, doc, 0.05)
  assert.equal(validation.ok, false)
  assert.match(validation.errors.join('\n'), /не распределено 100/)
})
