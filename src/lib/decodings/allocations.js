import { decodingId } from './id.js'
import {
  decimalAdd,
  decimalCanonical,
  decimalCompare,
  decimalSubtract,
  decimalSum,
} from './decimal.js'

export function rowAllocationKey(row) {
  return `${row.statementId}::${row.materialName}`
}

export function allocationsForRow(decodingState, decodingId, row) {
  return (decodingState?.allocations || []).filter(
    allocation =>
      allocation.decodingId === decodingId &&
      allocation.statementId === row.statementId &&
      allocation.materialName === row.materialName &&
      allocation.kind === 'spent',
  )
}

export function distributedLiters(decodingState, decodingId, row) {
  return decimalSum(
    allocationsForRow(decodingState, decodingId, row).map(allocation => allocation.liters),
  )
}

export function lotRemaining(decodingState, lotId, excludedDecodingId = null) {
  const lot = (decodingState?.densityLots || []).find(candidateLot => candidateLot.id === lotId)
  if (!lot) return null
  const used = decimalSum(
    (decodingState.allocations || [])
      .filter(
        allocation =>
          allocation.lotId === lotId &&
          allocation.kind === 'spent' &&
          allocation.decodingId !== excludedDecodingId,
      )
      .map(allocation => allocation.liters),
  )
  return decimalSubtract(lot.volumeLiters, used)
}

function availableLots(decodingState, document, materialName, manualAllocations) {
  const manualByLot = new Map()
  for (const allocation of manualAllocations) {
    manualByLot.set(
      allocation.lotId,
      decimalAdd(manualByLot.get(allocation.lotId) || '0', allocation.liters),
    )
  }

  return (decodingState.densityLots || [])
    .filter(lot => lot.materialName === materialName && lot.date <= document.sourceSnapshot.end)
    .map(lot => ({
      lot,
      remaining: decimalSubtract(
        lotRemaining(decodingState, lot.id, document.id) || '0',
        manualByLot.get(lot.id) || '0',
      ),
    }))
    .filter(row => decimalCompare(row.remaining, '0') === 1)
    .sort(
      (leftRow, rightRow) =>
        leftRow.lot.date.localeCompare(rightRow.lot.date) ||
        leftRow.lot.createdAt.localeCompare(rightRow.lot.createdAt) ||
        leftRow.lot.id.localeCompare(rightRow.lot.id),
    )
}

function allocateRow(row, targetLiters, lotRows, documentId) {
  const allocations = []
  let remainingTarget = decimalCanonical(targetLiters, '0')

  for (const lotRow of lotRows) {
    if (decimalCompare(remainingTarget, '0') !== 1) break
    if (row.lastWaybillDate && lotRow.lot.date > row.lastWaybillDate) continue
    if (decimalCompare(lotRow.remaining, '0') !== 1) continue
    const useAllLot = decimalCompare(lotRow.remaining, remainingTarget) <= 0
    const liters = useAllLot ? lotRow.remaining : remainingTarget
    allocations.push({
      id: decodingId(),
      decodingId: documentId,
      statementId: row.statementId,
      vehicleId: row.vehicleId,
      materialName: row.materialName,
      lotId: lotRow.lot.id,
      kind: 'spent',
      liters,
      source: 'auto',
      updatedAt: new Date().toISOString(),
    })
    lotRow.remaining = decimalSubtract(lotRow.remaining, liters)
    remainingTarget = decimalSubtract(remainingTarget, liters)
  }

  return { allocations, shortage: remainingTarget }
}

export function autoAllocateMaterial(decodingState, document, materialName) {
  const current = decodingState.allocations || []
  const kept = current.filter(
    allocation =>
      allocation.decodingId !== document.id ||
      allocation.materialName !== materialName ||
      allocation.source === 'manual',
  )
  const manual = kept.filter(
    allocation => allocation.decodingId === document.id && allocation.materialName === materialName,
  )
  const lotRows = availableLots(decodingState, document, materialName, manual)
  const rows = document.sourceSnapshot.rows
    .filter(row => row.materialName === materialName && Number(row.spent) > 0)
    .sort(
      (leftRow, rightRow) =>
        leftRow.lastWaybillDate.localeCompare(rightRow.lastWaybillDate) ||
        leftRow.vehicleShortNo.localeCompare(rightRow.vehicleShortNo, 'ru'),
    )
  const generated = []
  const shortages = []

  for (const row of rows) {
    const manualForRow = decimalSum(
      manual.filter(allocation => allocation.statementId === row.statementId).map(item => item.liters),
    )
    const target = decimalSubtract(String(row.spent), manualForRow)
    if (decimalCompare(target, '0') !== 1) continue
    const result = allocateRow(row, target, lotRows, document.id)
    generated.push(...result.allocations)
    if (decimalCompare(result.shortage, '0') === 1) {
      shortages.push({ row, liters: result.shortage })
    }
  }

  return { allocations: [...kept, ...generated], shortages }
}

export function manualRowAllocations(document, row, valuesByLot) {
  return Object.entries(valuesByLot || {})
    .map(([lotId, litersValue]) => ({ lotId, liters: decimalCanonical(litersValue) }))
    .filter(item => item.liters !== null && decimalCompare(item.liters, '0') === 1)
    .map(item => ({
      id: decodingId(),
      decodingId: document.id,
      statementId: row.statementId,
      vehicleId: row.vehicleId,
      materialName: row.materialName,
      lotId: item.lotId,
      kind: 'spent',
      liters: item.liters,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    }))
}
