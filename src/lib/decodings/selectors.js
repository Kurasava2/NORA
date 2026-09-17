import { decimalNumber, decimalSum } from './decimal.js'
import { buildMaterialLedger, densityBlocks } from './ledger.js'
import { DENSITY_ENTRY_OPENING, DENSITY_ENTRY_RECEIPT } from './model.js'

export function documentMaterials(document) {
  return [...new Set((document?.sourceSnapshot?.rows || []).map(row => row.materialName))]
    .sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
}

export function materialSourceRows(document, materialName) {
  return (document?.sourceSnapshot?.rows || []).filter(row => row.materialName === materialName)
}

function sourceTotals(rows) {
  return rows.reduce(
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
}

function ledgerTotal(rows, fieldName) {
  return decimalNumber(decimalSum(rows.map(row => row[fieldName] ?? '0'))) || 0
}

export function materialSummary(state, document, materialName) {
  const sourceRows = materialSourceRows(document, materialName)
  const totals = sourceTotals(sourceRows)
  const ledger = buildMaterialLedger(state, document, materialName)
  const densities = new Set(ledger.rows.map(row => row.density))
  return {
    ...totals,
    allocatedStart: ledgerTotal(ledger.rows, 'start'),
    allocatedReceived: ledgerTotal(ledger.rows, 'received'),
    allocatedSpent: ledgerTotal(ledger.rows, 'spent'),
    allocatedEnd: ledgerTotal(ledger.rows, 'end'),
    machines: new Set(sourceRows.map(row => row.vehicleId)).size,
    densities: densities.size,
    receiptCount: (state.decoding?.entries || []).filter(entry =>
      entry.periodId === document.periodId &&
      entry.materialName === materialName &&
      entry.kind === DENSITY_ENTRY_RECEIPT,
    ).length,
  }
}

export function documentStats(state, document, validation) {
  const materials = documentMaterials(document)
  const densityKeys = new Set()
  for (const materialName of materials) {
    for (const block of densityBlocks(state, document, materialName)) {
      densityKeys.add(`${materialName}::${block.density}`)
    }
  }
  const rows = document?.sourceSnapshot?.rows || []
  return {
    machines: new Set(rows.map(row => row.vehicleId)).size,
    materials: materials.length,
    densities: densityKeys.size,
    errors: validation?.errors?.length || 0,
  }
}

export function receiptsForMaterial(state, document, materialName) {
  return (state.decoding?.entries || [])
    .filter(entry =>
      entry.periodId === document.periodId &&
      entry.materialName === materialName &&
      entry.kind === DENSITY_ENTRY_RECEIPT,
    )
    .sort(
      (leftEntry, rightEntry) =>
        leftEntry.date.localeCompare(rightEntry.date) ||
        leftEntry.waybillNumber.localeCompare(rightEntry.waybillNumber, 'ru') ||
        leftEntry.createdAt.localeCompare(rightEntry.createdAt),
    )
}

export function densityInputsForMaterial(state, document, materialName) {
  return (state.decoding?.entries || [])
    .filter(entry =>
      entry.periodId === document.periodId &&
      entry.materialName === materialName &&
      [DENSITY_ENTRY_OPENING, DENSITY_ENTRY_RECEIPT].includes(entry.kind),
    )
    .sort(
      (leftEntry, rightEntry) =>
        leftEntry.date.localeCompare(rightEntry.date) ||
        leftEntry.waybillNumber.localeCompare(rightEntry.waybillNumber, 'ru') ||
        leftEntry.createdAt.localeCompare(rightEntry.createdAt),
    )
}
