import { num } from '../numbers.js'
import { buildOpening } from './statementOpening.js'
import { reconcileCarryForward } from './statementCarry.js'
import { sortTrips } from './materials.js'

function normalizedGsm(gsm) {
  return Object.keys(gsm || {})
    .sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
    .map(materialName => [materialName, num(gsm[materialName])])
}

export function openingSignature(opening) {
  if (!opening) return 'null'
  return JSON.stringify({
    sourcePeriodId: opening.sourcePeriodId || null,
    sourceStatementId: opening.sourceStatementId || null,
    odo: num(opening.odo),
    motohours: num(opening.motohours),
    gsm: normalizedGsm(opening.gsm),
    sourceHasErrors: Boolean(opening.sourceHasErrors),
  })
}

export function statementOpeningIsCurrent(state, period, statement) {
  if (!period || !statement) return true
  const expectedOpening = buildOpening(state, statement.vehicleId, period)
  return openingSignature(statement.opening) === openingSignature(expectedOpening)
}

function syncOpeningMetrics(statement) {
  if (!statement?.trips?.length || !statement.opening) return
  sortTrips(statement)
  const firstTrip = statement.trips[0]
  const openingOdometer = num(statement.opening.odo)
  const openingMotohours = num(statement.opening.motohours)

  if (openingOdometer !== null) firstTrip.odoStart = openingOdometer
  if (openingMotohours !== null) firstTrip.motohoursStart = openingMotohours
}

export function refreshStatementOpening(state, period, statement) {
  if (!period || !statement) return false
  const nextOpening = buildOpening(state, statement.vehicleId, period)
  if (openingSignature(statement.opening) === openingSignature(nextOpening)) return false

  statement.opening = nextOpening
  syncOpeningMetrics(statement)
  reconcileCarryForward(state, statement)
  return true
}
