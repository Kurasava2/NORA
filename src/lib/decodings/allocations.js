import { decodingId } from './id.js'
import {
  MOVEMENT_CARRY,
  MOVEMENT_OPENING,
  MOVEMENT_RECEIPT,
  MOVEMENT_SURRENDERED,
} from './model.js'
import {
  decimalAdd,
  decimalCompare,
  decimalSubtract,
  decimalSum,
} from './decimal.js'
import { allocationsForRow, movementsForRow } from './balances.js'

function movementOrder(leftMovement, rightMovement) {
  return (
    String(leftMovement.date || '').localeCompare(String(rightMovement.date || '')) ||
    waybillCompare(leftMovement.waybillNumber, rightMovement.waybillNumber) ||
    String(leftMovement.id || '').localeCompare(String(rightMovement.id || ''))
  )
}

function waybillCompare(leftValue, rightValue) {
  const leftNumber = Number(leftValue)
  const rightNumber = Number(rightValue)
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
  return String(leftValue || '').localeCompare(String(rightValue || ''), 'ru')
}

function movementBeforeTrip(movement, trip) {
  if (!movement.date) return true
  if (movement.date < trip.date) return true
  if (movement.date > trip.date) return false
  if (!movement.waybillNumber) return true
  return waybillCompare(movement.waybillNumber, trip.number) <= 0
}

function addBalance(balances, density, liters) {
  balances.set(density, decimalAdd(balances.get(density) || '0', liters) || '0')
}

function applyMovement(balances, movement) {
  if ([MOVEMENT_OPENING, MOVEMENT_CARRY, MOVEMENT_RECEIPT].includes(movement.kind)) {
    addBalance(balances, movement.density, movement.liters)
  }
  if (movement.kind === MOVEMENT_SURRENDERED) {
    addBalance(balances, movement.density, `-${movement.liters}`)
  }
}

function spendFromBalances(balances, liters, allocationBase) {
  const allocations = []
  let remaining = String(liters || '0')
  const candidates = [...balances.entries()]
    .filter(([, balance]) => decimalCompare(balance, '0') === 1)
    .sort((leftEntry, rightEntry) =>
      decimalCompare(leftEntry[1], rightEntry[1]) ||
      Number(leftEntry[0]) - Number(rightEntry[0]))

  for (const [density, balance] of candidates) {
    if (decimalCompare(remaining, '0') !== 1) break
    const useAll = decimalCompare(balance, remaining) <= 0
    const used = useAll ? balance : remaining
    allocations.push({
      ...allocationBase,
      id: decodingId(),
      density,
      liters: used,
      kind: 'spent',
      source: 'auto',
      updatedAt: new Date().toISOString(),
    })
    balances.set(density, decimalSubtract(balance, used))
    remaining = decimalSubtract(remaining, used)
  }
  return { allocations, shortage: remaining }
}

function allocateSourceRow(decodingState, document, row) {
  const balances = new Map()
  const movements = movementsForRow(decodingState, document, row).sort(movementOrder)
  const opening = movements.filter(movement =>
    [MOVEMENT_OPENING, MOVEMENT_CARRY].includes(movement.kind))
  opening.forEach(movement => applyMovement(balances, movement))
  const timed = movements.filter(movement =>
    ![MOVEMENT_OPENING, MOVEMENT_CARRY].includes(movement.kind))
  let movementIndex = 0
  const generated = []
  const shortages = []

  for (const trip of row.tripFlows || []) {
    while (
      movementIndex < timed.length &&
      movementBeforeTrip(timed[movementIndex], trip)
    ) {
      applyMovement(balances, timed[movementIndex])
      movementIndex += 1
    }
    if (Number(trip.spent || 0) <= 0) continue
    const result = spendFromBalances(balances, String(trip.spent), {
      decodingId: document.id,
      statementId: row.statementId,
      vehicleId: row.vehicleId,
      materialName: row.materialName,
      tripId: trip.tripId,
      tripDate: trip.date,
      waybillNumber: trip.number,
    })
    generated.push(...result.allocations)
    if (decimalCompare(result.shortage, '0') === 1) {
      shortages.push({ row, trip, liters: result.shortage })
    }
  }
  return { generated, shortages }
}

export function autoAllocateMaterial(decodingState, document, materialName) {
  const current = decodingState.allocations || []
  const kept = current.filter(allocation =>
    allocation.decodingId !== document.id ||
    allocation.materialName !== materialName ||
    allocation.source === 'manual')
  const generated = []
  const shortages = []

  for (const row of document.sourceSnapshot.rows || []) {
    if (row.materialName !== materialName) continue
    const manual = allocationsForRow({ ...decodingState, allocations: kept }, document, row)
      .filter(allocation => allocation.source === 'manual')
    if (manual.length) continue
    const result = allocateSourceRow(decodingState, document, row)
    generated.push(...result.generated)
    shortages.push(...result.shortages)
  }
  return { allocations: [...kept, ...generated], shortages }
}

export function manualRowAllocations(document, row, valuesByDensity) {
  return Object.entries(valuesByDensity || {})
    .filter(([, liters]) => decimalCompare(liters, '0') === 1)
    .map(([density, liters]) => ({
      id: decodingId(),
      decodingId: document.id,
      statementId: row.statementId,
      vehicleId: row.vehicleId,
      materialName: row.materialName,
      density,
      liters: String(liters).replace(',', '.'),
      kind: 'spent',
      source: 'manual',
      updatedAt: new Date().toISOString(),
    }))
}

export function distributedLiters(decodingState, document, row) {
  return decimalSum(allocationsForRow(decodingState, document, row).map(item => item.liters))
}
