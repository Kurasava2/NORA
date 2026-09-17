import { ALLOC_NONE, calculateVehicleConsumption } from '../autoCalc.js'
import { num } from '../numbers.js'
import { motohoursEnd } from '../vehicleMetrics.js'

function materialNames(statement) {
  const names = new Set()
  for (const trip of statement?.trips || []) {
    for (const materialName of Object.keys(trip?.gsm || {})) names.add(materialName)
  }
  return [...names].sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
}

function materialTotals(statement, materialName) {
  let start = null
  let received = 0
  let spent = 0
  let end = null
  const tripFlows = []

  for (const trip of statement?.trips || []) {
    const entry = trip?.gsm?.[materialName]
    if (!entry) continue
    const startValue = num(entry.start)
    const receivedValue = num(entry.received) || 0
    const spentValue = num(entry.spent) || 0
    const endValue = num(entry.end)
    if (start === null && startValue !== null) start = startValue
    received += receivedValue
    spent += spentValue
    if (endValue !== null) end = endValue
    tripFlows.push({
      tripId: String(trip.id || trip.seq || `${trip.date}-${trip.number}`),
      date: String(trip.date || ''),
      number: String(trip.number || ''),
      received: receivedValue,
      spent: spentValue,
    })
  }

  return {
    start: start ?? 0,
    received,
    surrendered: 0,
    spent,
    end: end ?? 0,
    tripFlows,
  }
}

function tripNormAllocations(vehicle, trip, catalog) {
  if (trip?.unused) return new Map()
  const gsm = Object.fromEntries(
    Object.entries(trip?.gsm || {}).map(([materialName, entry]) => [
      materialName,
      { ...entry, _calcSource: '' },
    ]),
  )
  const result = calculateVehicleConsumption(vehicle, { ...trip, gsm }, catalog)
  if (!result.ok) return null
  const totals = new Map()

  for (const rule of result.rules || []) {
    if (rule.allocation === ALLOC_NONE) continue
    for (const allocation of rule.allocations || []) {
      totals.set(
        allocation.material,
        (totals.get(allocation.material) || 0) + Number(allocation.spent || 0),
      )
    }
  }
  return totals
}

function statementNorms(vehicle, statement, catalog) {
  const totals = new Map()
  for (const trip of statement?.trips || []) {
    const allocations = tripNormAllocations(vehicle, trip, catalog)
    if (allocations === null) return null
    for (const [materialName, amount] of allocations) {
      totals.set(materialName, (totals.get(materialName) || 0) + amount)
    }
  }
  return totals
}

function lastTrip(statement) {
  const trips = statement?.trips || []
  return trips.length ? trips[trips.length - 1] : null
}

export function buildDecodingSourceSnapshot(state, period) {
  const vehiclesById = new Map((state?.vehicles || []).map(vehicle => [vehicle.id, vehicle]))
  const rows = []

  for (const statement of period?.statements || []) {
    if (!statement?.trips?.length) continue
    const vehicle = vehiclesById.get(statement.vehicleId) || {}
    const finalTrip = lastTrip(statement)
    const norms = statementNorms(vehicle, statement, state?.catalog || [])

    for (const materialName of materialNames(statement)) {
      const materialTotal = materialTotals(statement, materialName)
      const norm = norms?.has(materialName) ? norms.get(materialName) : null
      rows.push({
        statementId: statement.id,
        vehicleId: statement.vehicleId,
        vehicleShortNo: String(vehicle.shortNo || ''),
        vehicleModel: String(vehicle.model || ''),
        vehicleReg: String(vehicle.reg || ''),
        materialName,
        lastWaybillNumber: String(finalTrip?.number || ''),
        lastWaybillDate: String(finalTrip?.date || ''),
        odometerEnd: num(finalTrip?.odoEnd),
        motohoursEnd: motohoursEnd(finalTrip),
        ...materialTotal,
        norm,
        variance: norm === null ? null : norm - materialTotal.spent,
      })
    }
  }

  rows.sort(
    (leftRow, rightRow) =>
      leftRow.vehicleShortNo.localeCompare(rightRow.vehicleShortNo, 'ru') ||
      leftRow.materialName.localeCompare(rightRow.materialName, 'ru') ||
      leftRow.statementId.localeCompare(rightRow.statementId),
  )
  return {
    periodId: period?.id || null,
    reportMonth: period?.reportMonth || '',
    start: period?.start || '',
    end: period?.end || '',
    rows,
  }
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const output = {}
  for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key])
  return output
}

export function decodingSourceFingerprint(snapshot) {
  const source = JSON.stringify(canonicalize(snapshot))
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `v2-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
