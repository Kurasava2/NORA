import { num } from '../numbers.js'
import { buildOpening, findPrevStatement } from './statementOpening.js'
import { reconcileCarryForward } from './statementCarry.js'
import { sortTrips } from './materials.js'

function normalizedGsm(gsm) {
  return Object.keys(gsm || {})
    .sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
    .map(materialName => [materialName, num(gsm[materialName])])
}

function isDerivedOpening(opening) {
  return Boolean(opening?.sourcePeriodId || opening?.sourceStatementId)
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

function expectedOpening(state, period, statement) {
  const expected = buildOpening(state, statement.vehicleId, period)
  if (!expected && statement.opening && !isDerivedOpening(statement.opening)) {
    return statement.opening
  }
  return expected
}

function carryPath(state, period, statement) {
  if (!period || !statement) return []
  const path = [{ period, statement }]
  const seenPeriods = new Set([period.id])
  let cursorPeriod = period

  while (true) {
    const previous = findPrevStatement(state, statement.vehicleId, cursorPeriod)
    if (!previous || seenPeriods.has(previous.period.id)) break
    seenPeriods.add(previous.period.id)
    path.unshift(previous)
    cursorPeriod = previous.period
  }

  return path
}

export function statementCarryPathIsCurrent(state, period, statement) {
  return carryPath(state, period, statement).every(item => {
    const expected = expectedOpening(state, item.period, item.statement)
    return openingSignature(item.statement.opening) === openingSignature(expected)
  })
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
  const nextOpening = expectedOpening(state, period, statement)
  if (openingSignature(statement.opening) === openingSignature(nextOpening)) return false

  statement.opening = nextOpening
  syncOpeningMetrics(statement)
  reconcileCarryForward(state, statement)
  return true
}

export function refreshCarryPathToStatement(state, period, statement) {
  let updatedStatements = 0
  for (const item of carryPath(state, period, statement)) {
    if (refreshStatementOpening(state, item.period, item.statement)) updatedStatements += 1
  }
  return updatedStatements
}

export function refreshPeriodCarry(state, period) {
  if (!period) return 0
  let updatedStatements = 0
  const refreshedIds = new Set()

  for (const statement of period.statements || []) {
    const path = carryPath(state, period, statement)
    for (const item of path) {
      if (refreshedIds.has(item.statement.id)) continue
      refreshedIds.add(item.statement.id)
      if (refreshStatementOpening(state, item.period, item.statement)) updatedStatements += 1
    }
  }

  return updatedStatements
}
