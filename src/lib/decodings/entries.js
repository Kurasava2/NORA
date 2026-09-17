import { decimalAdd, decimalCanonical, decimalCompare, decimalSum } from './decimal.js'

export function entriesForRow(decodingState, periodId, row, kind = null) {
  return (decodingState?.entries || []).filter(entry =>
    entry.periodId === periodId &&
    entry.vehicleId === row.vehicleId &&
    entry.materialName === row.materialName &&
    (!kind || entry.kind === kind)
  )
}

export function entryDensities(entries) {
  return [...new Set((entries || []).map(entry => entry.density).filter(Boolean))]
    .sort((leftDensity, rightDensity) => Number(leftDensity) - Number(rightDensity))
}

export function sumEntries(entries) {
  return decimalSum((entries || []).map(entry => entry.liters))
}

export function sumEntriesByDensity(entries) {
  const totals = new Map()
  for (const entry of entries || []) {
    const density = decimalCanonical(entry.density)
    const liters = decimalCanonical(entry.liters)
    if (!density || !liters || decimalCompare(liters, '0') !== 1) continue
    totals.set(density, decimalAdd(totals.get(density) || '0', liters))
  }
  return totals
}

export function positiveMapEntries(valuesByDensity) {
  return [...(valuesByDensity || new Map()).entries()]
    .filter(([, liters]) => decimalCompare(liters, '0') === 1)
}
