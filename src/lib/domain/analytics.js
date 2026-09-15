import { num } from '../numbers.js'
import { motohoursWorked } from '../vehicleMetrics.js'
import { materialOf } from './catalog.js'
import { sortedPeriods } from './formatting.js'
import { statementMaterialNames, tripMaterialNames } from './materials.js'
import { statementStatus } from './statementValidation.js'
import { vehicleOf } from './vehicles.js'

const PERIOD_ROWS_CACHE = new WeakMap()
const VEHICLE_HISTORY_CACHE = new WeakMap()

export function stStats(state, statement) {
  let mileage = 0
  let fuelSpent = 0
  let totalMotohours = 0
  let drivenTrips = 0

  for (const trip of statement.trips || []) {
    const odometerStart = num(trip.odoStart)
    const odometerEnd = num(trip.odoEnd)
    const workedMotohours = motohoursWorked(trip)

    if (odometerStart !== null && odometerEnd !== null) {
      mileage += odometerEnd - odometerStart
    }
    if (workedMotohours !== null) totalMotohours += workedMotohours
    if (!trip.unused) drivenTrips += 1

    for (const materialName of tripMaterialNames(trip)) {
      if (materialOf(state, materialName).category === 'Топливо') {
        fuelSpent += num(trip.gsm?.[materialName]?.spent) || 0
      }
    }
  }

  return {
    trips: statement.trips?.length || 0,
    drivenTrips,
    km: mileage,
    motohours: totalMotohours,
    fuel: fuelSpent,
  }
}

export function totals(statement) {
  const totalsByMaterial = {}

  for (const materialName of statementMaterialNames(statement)) {
    let received = 0
    let spent = 0
    let start = null
    let end = null

    for (const trip of statement.trips || []) {
      const materialEntry = trip.gsm?.[materialName]
      if (!materialEntry) continue

      const startValue = num(materialEntry.start)
      const endValue = num(materialEntry.end)
      if (start === null && startValue !== null) start = startValue
      received += num(materialEntry.received) || 0
      spent += num(materialEntry.spent) || 0
      if (endValue !== null) end = endValue
    }

    totalsByMaterial[materialName] = {
      start: start ?? 0,
      received,
      spent,
      end: end ?? 0,
    }
  }

  return totalsByMaterial
}

export function lastBalances(statement) {
  const lastTrip = statement.trips?.[statement.trips.length - 1]
  const balances = {}

  for (const materialName of tripMaterialNames(lastTrip)) {
    const endAmount = num(lastTrip.gsm?.[materialName]?.end)
    if (endAmount !== null && Math.abs(endAmount) > 1e-9) {
      balances[materialName] = endAmount
    }
  }

  return balances
}

export function periodFleetRows(state, period) {
  let stateCache = PERIOD_ROWS_CACHE.get(state)
  if (!stateCache) {
    stateCache = new WeakMap()
    PERIOD_ROWS_CACHE.set(state, stateCache)
  }

  const cachedRows = stateCache.get(period)
  if (cachedRows) return cachedRows

  const statementsByVehicle = new Map(
    (period.statements || []).map(statement => [statement.vehicleId, statement]),
  )

  const rows = (state.vehicles || []).map(baseVehicle => {
    const vehicle = vehicleOf(state, baseVehicle.id)
    const statement = statementsByVehicle.get(baseVehicle.id)

    if (!statement) {
      return {
        vehicle,
        statement: null,
        status: { key: 'idle', label: 'Не ездила', tone: 'ok' },
        stats: { trips: 0, drivenTrips: 0, km: 0, motohours: 0, fuel: 0 },
      }
    }

    return {
      vehicle,
      statement,
      status: statementStatus(state, statement, period),
      stats: stStats(state, statement),
    }
  })

  stateCache.set(period, rows)
  return rows
}

export function vehicleHistory(state, vehicleId) {
  let stateCache = VEHICLE_HISTORY_CACHE.get(state)
  if (!stateCache) {
    stateCache = new Map()
    VEHICLE_HISTORY_CACHE.set(state, stateCache)
  }

  if (stateCache.has(vehicleId)) return stateCache.get(vehicleId)

  const historyRows = []
  for (const period of sortedPeriods(state)) {
    const statement = (period.statements || []).find(
      candidateStatement => candidateStatement.vehicleId === vehicleId,
    )
    if (!statement) continue

    historyRows.push({
      period,
      statement,
      status: statementStatus(state, statement, period),
      stats: stStats(state, statement),
      balances: lastBalances(statement),
    })
  }

  stateCache.set(vehicleId, historyRows)
  return historyRows
}
