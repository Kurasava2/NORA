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

  for (const trip of statement?.trips || []) {
    const entry = trip?.gsm?.[materialName]
    if (!entry) continue
    const startValue = num(entry.start)
    const endValue = num(entry.end)
    if (start === null && startValue !== null) start = startValue
    received += num(entry.received) || 0
    spent += num(entry.spent) || 0
    if (endValue !== null) end = endValue
  }

  return { start: start ?? 0, received, surrendered: 0, spent, end: end ?? 0 }
}

function lastTrip(statement) {
  const trips = statement?.trips || []
  return trips.length ? trips[trips.length - 1] : null
}

function vehicleIndex(state) {
  return new Map((state?.vehicles || []).map(vehicle => [vehicle.id, vehicle]))
}

export function buildDecodingSourceSnapshot(state, period) {
  const vehiclesById = vehicleIndex(state)
  const rows = []

  for (const statement of period?.statements || []) {
    if (!statement?.trips?.length) continue
    const vehicle = vehiclesById.get(statement.vehicleId) || {}
    const finalTrip = lastTrip(statement)

    for (const materialName of materialNames(statement)) {
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
        ...materialTotals(statement, materialName),
        norm: null,
        variance: null,
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

  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
