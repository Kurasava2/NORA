import { decimalCompare, decimalMultiply } from './decimal.js'
import { entriesForRow, sumEntriesByDensity } from './entries.js'
import { buildSourceDensityRows } from './ledgerCore.js'
import { DENSITY_ENTRY_OPENING } from './model.js'

function previousDocumentForRow(state, document, row) {
  return (state?.decoding?.documents || [])
    .filter(candidate =>
      candidate.id !== document.id &&
      candidate.mode === document.mode &&
      candidate.sourceSnapshot?.end < document.sourceSnapshot?.start &&
      (candidate.sourceSnapshot?.rows || []).some(sourceRow =>
        sourceRow.vehicleId === row.vehicleId && sourceRow.materialName === row.materialName,
      ),
    )
    .sort((leftDocument, rightDocument) =>
      rightDocument.sourceSnapshot.end.localeCompare(leftDocument.sourceSnapshot.end),
    )[0] || null
}

function previousOpening(state, document, row, cache) {
  const previousDocument = previousDocumentForRow(state, document, row)
  if (!previousDocument) return null
  const previousLedger = buildMaterialLedger(state, previousDocument, row.materialName, cache)
  const densityRows = previousLedger.rows.filter(item => item.vehicleId === row.vehicleId)
  const opening = new Map()
  for (const densityRow of densityRows) {
    if (decimalCompare(densityRow.end, '0') === 1) {
      opening.set(densityRow.density, densityRow.end)
    }
  }
  return {
    opening,
    sourcePeriodId: previousDocument.periodId,
    sourceDocumentId: previousDocument.id,
  }
}

function openingForRow(state, document, row, cache) {
  const previous = previousOpening(state, document, row, cache)
  if (previous) return previous
  const entries = entriesForRow(
    state.decoding,
    document.periodId,
    row,
    DENSITY_ENTRY_OPENING,
  )
  return {
    opening: sumEntriesByDensity(entries),
    sourcePeriodId: null,
    sourceDocumentId: null,
  }
}

function massFields(densityRow) {
  return {
    startKg: decimalMultiply(densityRow.start, densityRow.density) || '0',
    receivedKg: decimalMultiply(densityRow.received, densityRow.density) || '0',
    surrenderedKg: decimalMultiply(densityRow.surrendered, densityRow.density) || '0',
    spentKg: decimalMultiply(densityRow.spent, densityRow.density) || '0',
    normKg: densityRow.norm === null
      ? null
      : decimalMultiply(densityRow.norm, densityRow.density) || '0',
    endKg: decimalMultiply(densityRow.end, densityRow.density) || '0',
  }
}

function ledgerRow(sourceRow, densityRow, openingSource, manual) {
  return {
    statementId: sourceRow.statementId,
    vehicleId: sourceRow.vehicleId,
    vehicleShortNo: sourceRow.vehicleShortNo,
    vehicleModel: sourceRow.vehicleModel,
    vehicleReg: sourceRow.vehicleReg,
    materialName: sourceRow.materialName,
    lastWaybillNumber: sourceRow.lastWaybillNumber,
    lastWaybillDate: sourceRow.lastWaybillDate,
    odometerEnd: sourceRow.odometerEnd,
    motohoursEnd: sourceRow.motohoursEnd,
    sourceStart: sourceRow.start,
    sourceReceived: sourceRow.received,
    sourceSurrendered: sourceRow.surrendered,
    sourceSpent: sourceRow.spent,
    sourceNorm: sourceRow.norm,
    sourceEnd: sourceRow.end,
    openingSource,
    manualSpent: manual,
    ...densityRow,
    ...massFields(densityRow),
  }
}

export function buildMaterialLedger(state, document, materialName, cache = new Map()) {
  const cacheKey = `${document?.id || 'none'}::${materialName}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const ledger = { materialName, rows: [], issues: [] }
  cache.set(cacheKey, ledger)
  if (!document) return ledger

  const sourceRows = (document.sourceSnapshot?.rows || [])
    .filter(row => row.materialName === materialName)

  for (const sourceRow of sourceRows) {
    const openingInfo = openingForRow(state, document, sourceRow, cache)
    const result = buildSourceDensityRows(
      state.decoding,
      document,
      sourceRow,
      openingInfo.opening,
    )
    for (const densityRow of result.rows) {
      ledger.rows.push(ledgerRow(sourceRow, densityRow, openingInfo, result.manual))
    }
    for (const message of result.issues) {
      ledger.issues.push({ sourceRow, message })
    }
  }

  ledger.rows.sort(
    (leftRow, rightRow) =>
      Number(leftRow.density) - Number(rightRow.density) ||
      leftRow.vehicleShortNo.localeCompare(rightRow.vehicleShortNo, 'ru'),
  )
  return ledger
}

export function densityBlocks(state, document, materialName) {
  const ledger = buildMaterialLedger(state, document, materialName)
  const byDensity = new Map()
  for (const row of ledger.rows) {
    if (!byDensity.has(row.density)) byDensity.set(row.density, [])
    byDensity.get(row.density).push(row)
  }
  return [...byDensity.entries()]
    .map(([density, rows]) => ({ density, rows }))
    .sort((leftBlock, rightBlock) => Number(leftBlock.density) - Number(rightBlock.density))
}
