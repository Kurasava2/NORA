import { num } from '../numbers.js'
import { motohoursEnd } from '../vehicleMetrics.js'
import { uid } from './defaults.js'
import { periodName } from './formatting.js'
import { nonZero, tripMaterialNames } from './materials.js'
import { validateStatement } from './statementValidation.js'

export function findPrevStatement(state, vehicleId, period) {
  const previousPeriods = state.periods
    .filter(candidatePeriod => candidatePeriod.id !== period.id && candidatePeriod.end < period.start)
    .sort((firstPeriod, secondPeriod) => secondPeriod.end.localeCompare(firstPeriod.end))

  for (const previousPeriod of previousPeriods) {
    const previousStatement = (previousPeriod.statements || []).find(
      statement => statement.vehicleId === vehicleId && statement.trips?.length,
    )
    if (previousStatement) {
      return { period: previousPeriod, statement: previousStatement }
    }
  }

  return null
}

export function buildOpening(state, vehicleId, period) {
  const previous = findPrevStatement(state, vehicleId, period)
  if (!previous) return null

  const previousStatement = previous.statement
  const lastTrip = previousStatement.trips[previousStatement.trips.length - 1]
  const openingMaterials = {}

  for (const materialName of tripMaterialNames(lastTrip)) {
    const endAmount = num(lastTrip?.gsm?.[materialName]?.end)
    if (endAmount !== null && nonZero(state, endAmount)) {
      openingMaterials[materialName] = endAmount
    }
  }

  const validation = validateStatement(state, previousStatement, previous.period)

  return {
    sourcePeriodId: previous.period.id,
    sourceStatementId: previousStatement.id,
    sourceLabel: periodName(previous.period),
    odo: num(lastTrip?.odoEnd),
    motohours: motohoursEnd(lastTrip),
    gsm: openingMaterials,
    sourceHasErrors: validation.errors.length > 0,
  }
}

export function createStatement(state, period, vehicle) {
  return {
    id: uid(),
    vehicleId: vehicle.id,
    materials: [],
    trips: [],
    opening: buildOpening(state, vehicle.id, period),
    createdAt: new Date().toISOString(),
  }
}
