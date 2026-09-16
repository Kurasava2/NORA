import assert from 'node:assert/strict'
import test from 'node:test'
import {
  refreshCarryPathToStatement,
  statementCarryPathIsCurrent,
} from '../src/lib/domain/autoCarry.js'
import { syncCarriedStart } from '../src/lib/carry.js'

function trip(id, date, number, odoStart, odoEnd) {
  return {
    id,
    date,
    number,
    odoStart,
    odoEnd,
    motohoursStart: '',
    motohoursEnd: '',
    unused: false,
    note: '',
    gsm: {},
  }
}

function opening(sourcePeriodId, sourceStatementId, sourceLabel, odo) {
  return {
    sourcePeriodId,
    sourceStatementId,
    sourceLabel,
    odo,
    motohours: null,
    gsm: {},
    sourceHasErrors: false,
  }
}

function testState() {
  const aprilStatement = {
    id: 's-apr',
    vehicleId: 'v1',
    opening: null,
    materials: [],
    trips: [trip('t-apr', '2026-04-01', '1', 100, 200)],
  }
  const mayStatement = {
    id: 's-may',
    vehicleId: 'v1',
    opening: opening('apr', 's-apr', '21.03–20.04.2026', 200),
    materials: [],
    trips: [trip('t-may', '2026-05-01', '2', 200, 300)],
  }
  const juneStatement = {
    id: 's-jun',
    vehicleId: 'v1',
    opening: opening('may', 's-may', '21.04–20.05.2026', 300),
    materials: [],
    trips: [trip('t-jun', '2026-06-01', '3', 300, 400)],
  }
  const julyStatement = {
    id: 's-jul',
    vehicleId: 'v1',
    opening: opening('jun', 's-jun', '21.05–20.06.2026', 400),
    materials: [],
    trips: [trip('t-jul', '2026-07-01', '4', 400, 500)],
  }

  return {
    settings: { tolerance: 0.05 },
    vehicles: [{ id: 'v1', model: 'Тест', shortNo: '1', reg: 'ТЕСТ', hasMotohours: false }],
    periods: [
      { id: 'apr', start: '2026-03-21', end: '2026-04-20', statements: [aprilStatement] },
      { id: 'may', start: '2026-04-21', end: '2026-05-20', statements: [mayStatement] },
      { id: 'jun', start: '2026-05-21', end: '2026-06-20', statements: [juneStatement] },
      { id: 'jul', start: '2026-06-21', end: '2026-07-20', statements: [julyStatement] },
    ],
  }
}

test('lazy carry refreshes only the dependency path up to the opened statement', () => {
  const state = testState()
  state.periods[0].statements[0].trips[0].odoEnd = 250
  const junePeriod = state.periods[2]
  const juneStatement = junePeriod.statements[0]

  assert.equal(statementCarryPathIsCurrent(state, junePeriod, juneStatement), false)
  const updated = refreshCarryPathToStatement(state, junePeriod, juneStatement)

  assert.equal(updated, 1)
  assert.equal(state.periods[1].statements[0].opening.odo, 250)
  assert.equal(state.periods[1].statements[0].trips[0].odoStart, 250)
  assert.equal(state.periods[3].statements[0].opening.odo, 400)
  assert.equal(statementCarryPathIsCurrent(state, junePeriod, juneStatement), true)
})

test('carried material rebalance updates automatic targets but preserves manual values', () => {
  const automatic = {
    start: 80,
    received: 20,
    spent: 30,
    end: 70,
    _carried: true,
    _autoTarget: 'end',
  }
  syncCarriedStart(automatic, 90)
  assert.equal(automatic.start, 90)
  assert.equal(automatic.end, 80)

  const manual = { ...automatic, start: 80, end: 70, _autoTarget: '' }
  syncCarriedStart(manual, 90)
  assert.equal(manual.start, 90)
  assert.equal(manual.end, 70)
})

test('lazy carry does not require a per-vehicle auto toggle', async () => {
  const panelSource = await import('node:fs/promises').then(fs =>
    fs.readFile(new URL('../src/components/statement/CarryPanel.jsx', import.meta.url), 'utf8'),
  )
  const tripActionsSource = await import('node:fs/promises').then(fs =>
    fs.readFile(new URL('../src/modals/trip/useTripActions.js', import.meta.url), 'utf8'),
  )

  assert.doesNotMatch(panelSource, /type="checkbox"|>Авто</)
  assert.doesNotMatch(tripActionsSource, /syncFutureVehicleCarry/)
})
