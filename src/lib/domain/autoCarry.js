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

export function autoCarryEnabled(state, vehicleId) {
  return Boolean(state?.vehicleSettings?.[vehicleId]?.autoCarry)
}

export function setAutoCarryEnabled(state, vehicleId, enabled) {
  state.vehicleSettings = state.vehicleSettings || {}
  const settings = { ...(state.vehicleSettings[vehicleId] || {}) }

  if (enabled) settings.autoCarry = true
  else delete settings.autoCarry

  if (Object.keys(settings).length) state.vehicleSettings[vehicleId] = settings
  else delete state.vehicleSettings[vehicleId]
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

export function syncFutureVehicleCarry(state, vehicleId, sourcePeriod) {
  if (!autoCarryEnabled(state, vehicleId) || !sourcePeriod) return 0

  const futurePeriods = [...(state.periods || [])]
    .filter(period => period.id !== sourcePeriod.id && period.start > sourcePeriod.start)
    .sort((leftPeriod, rightPeriod) => leftPeriod.start.localeCompare(rightPeriod.start))

  let updatedStatements = 0
  for (const period of futurePeriods) {
    const statement = (period.statements || []).find(item => item.vehicleId === vehicleId)
    if (!statement) continue

    const changed = refreshStatementOpening(state, period, statement)
    if (!changed) break
    updatedStatements += 1
  }
  return updatedStatements
}
