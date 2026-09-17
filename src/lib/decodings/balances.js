import {
  MOVEMENT_CARRY,
  MOVEMENT_OPENING,
  MOVEMENT_RECEIPT,
  MOVEMENT_SURRENDERED,
  createDensityMovement,
} from './model.js'
import {
  decimalAdd,
  decimalCompare,
  decimalMultiply,
  decimalSubtract,
  decimalSum,
} from './decimal.js'

export function movementsForRow(decodingState, document, row) {
  return (decodingState?.densityMovements || []).filter(
    movement =>
      movement.periodId === document.periodId &&
      movement.vehicleId === row.vehicleId &&
      movement.materialName === row.materialName,
  )
}

export function allocationsForRow(decodingState, document, row) {
  return (decodingState?.allocations || []).filter(
    allocation =>
      allocation.decodingId === document.id &&
      allocation.statementId === row.statementId &&
      allocation.materialName === row.materialName &&
      allocation.kind === 'spent',
  )
}

export function distributedLiters(decodingState, document, row) {
  return decimalSum(allocationsForRow(decodingState, document, row).map(item => item.liters))
}

function addByDensity(target, density, liters) {
  const current = target.get(density) || '0'
  target.set(density, decimalAdd(current, liters) || current)
}

export function densityBalanceRows(decodingState, document, row) {
  const values = new Map()
  const ensure = density => {
    if (!values.has(density)) {
      values.set(density, {
        density,
        start: '0',
        received: '0',
        surrendered: '0',
        spent: '0',
        end: '0',
      })
    }
    return values.get(density)
  }

  for (const movement of movementsForRow(decodingState, document, row)) {
    const target = ensure(movement.density)
    if ([MOVEMENT_OPENING, MOVEMENT_CARRY].includes(movement.kind)) {
      target.start = decimalAdd(target.start, movement.liters)
    } else if (movement.kind === MOVEMENT_RECEIPT) {
      target.received = decimalAdd(target.received, movement.liters)
    } else if (movement.kind === MOVEMENT_SURRENDERED) {
      target.surrendered = decimalAdd(target.surrendered, movement.liters)
    }
  }

  for (const allocation of allocationsForRow(decodingState, document, row)) {
    const target = ensure(allocation.density)
    target.spent = decimalAdd(target.spent, allocation.liters)
  }

  for (const target of values.values()) {
    target.end = decimalSubtract(
      decimalAdd(target.start, target.received),
      decimalAdd(target.surrendered, target.spent),
    )
    target.startKg = decimalMultiply(target.start, target.density)
    target.receivedKg = decimalMultiply(target.received, target.density)
    target.spentKg = decimalMultiply(target.spent, target.density)
    target.endKg = decimalMultiply(target.end, target.density)
  }

  return [...values.values()].sort((leftRow, rightRow) =>
    Number(leftRow.density) - Number(rightRow.density))
}

export function sourceTotalsByDensity(rows, field) {
  return decimalSum((rows || []).map(row => row[field] || '0'))
}

function previousRowSource(decodingState, document, row) {
  const currentStart = document?.sourceSnapshot?.start || ''
  const previousDocuments = (decodingState?.documents || [])
    .filter(candidate =>
      candidate.id !== document.id &&
      candidate.mode === document.mode &&
      (candidate.sourceSnapshot?.end || '') < currentStart)
    .sort((leftDoc, rightDoc) =>
      (rightDoc.sourceSnapshot?.end || '').localeCompare(leftDoc.sourceSnapshot?.end || ''))

  for (const previousDocument of previousDocuments) {
    const previousRow = (previousDocument.sourceSnapshot?.rows || []).find(candidate =>
      candidate.vehicleId === row.vehicleId &&
      candidate.materialName === row.materialName)
    if (previousRow) return { document: previousDocument, row: previousRow }
  }
  return null
}

export function buildCarryMovements(decodingState, document) {
  const currentRows = document?.sourceSnapshot?.rows || []
  const movements = []

  for (const row of currentRows) {
    const previous = previousRowSource(decodingState, document, row)
    if (!previous) continue

    for (const balance of densityBalanceRows(decodingState, previous.document, previous.row)) {
      if (decimalCompare(balance.end, '0') !== 1) continue
      movements.push(createDensityMovement({
        period: { id: document.periodId, start: document.sourceSnapshot.start },
        vehicleId: row.vehicleId,
        materialName: row.materialName,
        density: balance.density,
        liters: balance.end,
        date: document.sourceSnapshot.start,
        kind: MOVEMENT_CARRY,
        generated: true,
        sourcePeriodId: previous.document.periodId,
      }))
    }
  }
  return movements
}

export function replaceCarryMovements(decodingState, document) {
  const retained = (decodingState.densityMovements || []).filter(
    movement => movement.periodId !== document.periodId || movement.kind !== MOVEMENT_CARRY,
  )
  decodingState.densityMovements = [...retained, ...buildCarryMovements(decodingState, document)]
}
