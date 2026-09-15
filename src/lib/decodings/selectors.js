import { distributedLiters, lotRemaining } from './allocations.js'
import { decimalNumber } from './decimal.js'

export function documentMaterials(document) {
  return [...new Set((document?.sourceSnapshot?.rows || []).map(row => row.materialName))]
    .sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
}

export function materialSourceRows(document, materialName) {
  return (document?.sourceSnapshot?.rows || []).filter(row => row.materialName === materialName)
}

export function materialSummary(decodingState, document, materialName) {
  const rows = materialSourceRows(document, materialName)
  const totals = rows.reduce(
    (summary, row) => ({
      start: summary.start + Number(row.start || 0),
      received: summary.received + Number(row.received || 0),
      surrendered: summary.surrendered + Number(row.surrendered || 0),
      spent: summary.spent + Number(row.spent || 0),
      norm: summary.norm + Number(row.norm || 0),
      normKnown: summary.normKnown && row.norm !== null,
      end: summary.end + Number(row.end || 0),
    }),
    { start: 0, received: 0, surrendered: 0, spent: 0, norm: 0, normKnown: true, end: 0 },
  )
  const distributed = rows.reduce(
    (sum, row) => sum + Number(distributedLiters(decodingState, document.id, row) || 0),
    0,
  )
  const lots = (decodingState?.densityLots || []).filter(lot => lot.materialName === materialName)
  const densities = new Set(lots.map(lot => lot.density).filter(Boolean))

  return {
    ...totals,
    distributed,
    machines: new Set(rows.map(row => row.vehicleId)).size,
    lots: lots.length,
    densities: densities.size,
  }
}

export function documentStats(decodingState, document, validation) {
  const materials = documentMaterials(document)
  const rows = document?.sourceSnapshot?.rows || []
  const densities = new Set(
    (decodingState?.densityLots || [])
      .filter(lot => materials.includes(lot.materialName))
      .map(lot => `${lot.materialName}::${lot.density}`),
  )
  return {
    machines: new Set(rows.map(row => row.vehicleId)).size,
    materials: materials.length,
    densities: densities.size,
    errors: validation?.errors?.length || 0,
  }
}

export function materialLots(decodingState, materialName) {
  return (decodingState?.densityLots || [])
    .filter(lot => lot.materialName === materialName)
    .map(lot => ({
      ...lot,
      remaining: lotRemaining(decodingState, lot.id),
      remainingNumber: decimalNumber(lotRemaining(decodingState, lot.id)),
    }))
    .sort(
      (leftLot, rightLot) =>
        leftLot.date.localeCompare(rightLot.date) || leftLot.createdAt.localeCompare(rightLot.createdAt),
    )
}
