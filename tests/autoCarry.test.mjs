import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const autoCarrySource = fs.readFileSync(
  new URL('../src/lib/domain/autoCarry.js', import.meta.url),
  'utf8',
)
const tripActionsSource = fs.readFileSync(
  new URL('../src/modals/trip/useTripActions.js', import.meta.url),
  'utf8',
)
const carryPanelSource = fs.readFileSync(
  new URL('../src/components/statement/CarryPanel.jsx', import.meta.url),
  'utf8',
)

test('auto carry is per vehicle and stops the forward cascade on the first unchanged statement', () => {
  assert.match(autoCarrySource, /vehicleSettings\?\.\[vehicleId\]\?\.autoCarry/)
  assert.match(autoCarrySource, /if \(!changed\) break/)
  assert.match(autoCarrySource, /refreshStatementOpening/)
})

test('trip saves trigger auto carry and the transfer card exposes a toggle', () => {
  assert.match(tripActionsSource, /syncFutureVehicleCarry/)
  assert.match(carryPanelSource, /type="checkbox"/)
  assert.match(carryPanelSource, />Авто</)
})
