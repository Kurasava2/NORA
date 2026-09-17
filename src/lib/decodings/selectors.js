import {
  allocationsForRow,
  densityBalanceRows,
  distributedLiters,
  movementsForRow,
  sourceTotalsByDensity,
} from './balances.js'
import { decimalNumber, decimalSum } from './decimal.js'

export function documentMaterials(document) {
  return [...new Set((document?.sourceSnapshot?.rows || []).map(row => row.materialName))]
    .sort((leftName, rightName) => leftName.localeCompare(rightName, 'ru'))
}

export function materialSourceRows(document, materialName) {
  return (document?.sourceSnapshot?.rows || []).filter(row => row.materialName === materialName)
}

export function materialMovements(decodingState, document, materialName) {
  if (!document) return []
  return (decodingState?.densityMovements || [])
    .filter(movement =>
      movement.periodId === document.periodId &&
      movement.materialName === materialName)
    .sort((leftMovement, rightMovement) =>
      String(leftMovement.date || '').localeCompare(String(rightMovement.date || '')) ||
      String(leftMovement.waybillNumber || '').localeCompare(
        String(rightMovement.waybillNumber || ''),
        'ru',
        { numeric: true },
      ))
}

export function materialDensityRows(decodingState, document, materialName) {
  const output = []
  for (const sourceRow of materialSourceRows(document, materialName)) {
    for (const balance of densityBalanceRows(decodingState, document, sourceRow)) {
      output.push({
        ...balance,
        statementId: sourceRow.statementId,
        vehicleId: sourceRow.vehicleId,
        vehicleShortNo: sourceRow.vehicleShortNo,
        vehicleModel: sourceRow.vehicleModel,
        vehicleReg: sourceRow.vehicleReg,
        lastWaybillNumber: sourceRow.lastWaybillNumber,
        odometerEnd: sourceRow.odometerEnd,
        motohoursEnd: sourceRow.motohoursEnd,
        sourceNorm: sourceRow.norm,
        sourceSpent: sourceRow.spent,
      })
    }
  }
  return output.sort(
    (leftRow, rightRow) =>
      Number(leftRow.density) - Number(rightRow.density) ||
      leftRow.vehicleShortNo.localeCompare(rightRow.vehicleShortNo, 'ru', { numeric: true }),
  )
}

export function materialDensityTotals(decodingState, document, materialName) {
  const rows = materialDensityRows(decodingState, document, materialName)
  const grouped = new Map()

  for (const row of rows) {
    if (!grouped.has(row.density)) grouped.set(row.density, [])
    grouped.get(row.density).push(row)
  }

  return [...grouped.entries()]
    .map(([density, densityRows]) => ({
      density,
      rows: densityRows,
      start: sourceTotalsByDensity(densityRows, 'start'),
      received: sourceTotalsByDensity(densityRows, 'received'),
      surrendered: sourceTotalsByDensity(densityRows, 'surrendered'),
      spent: sourceTotalsByDensity(densityRows, 'spent'),
      end: sourceTotalsByDensity(densityRows, 'end'),
      startKg: decimalSum(densityRows.map(row => row.startKg)),
      receivedKg: decimalSum(densityRows.map(row => row.receivedKg)),
      spentKg: decimalSum(densityRows.map(row => row.spentKg)),
      endKg: decimalSum(densityRows.map(row => row.endKg)),
    }))
    .sort((leftGroup, rightGroup) => Number(leftGroup.density) - Number(rightGroup.density))
}

export function materialSummary(decodingState, document, materialName) {
  const rows = materialSourceRows(document, materialName)
  const source = rows.reduce(
    (summary, row) => ({
      start: summary.start + Number(row.start || 0),
      received: summary.received + Number(row.received || 0),
      surrendered: summary.surrendered + Number(row.surrendered || 0),
      spent: summary.spent + Number(row.spent || 0),
      norm: summary.norm + Number(row.norm || 0),
      end: summary.end + Number(row.end || 0),
    }),
    { start: 0, received: 0, surrendered: 0, spent: 0, norm: 0, end: 0 },
  )
  const distributed = rows.reduce(
    (sum, row) => sum + Number(distributedLiters(decodingState, document, row) || 0),
    0,
  )
  const densities = new Set(
    materialDensityRows(decodingState, document, materialName).map(row => row.density),
  )
  const receipts = materialMovements(decodingState, document, materialName)
    .filter(movement => movement.kind === 'receipt')

  return {
    ...source,
    distributed,
    machines: new Set(rows.map(row => row.vehicleId)).size,
    densities: densities.size,
    receipts: receipts.length,
  }
}

export function documentStats(decodingState, document, validation) {
  const materials = documentMaterials(document)
  const rows = document?.sourceSnapshot?.rows || []
  const densities = new Set()
  for (const materialName of materials) {
    for (const densityRow of materialDensityRows(decodingState, document, materialName)) {
      densities.add(`${materialName}::${densityRow.density}`)
    }
  }
  return {
    machines: new Set(rows.map(row => row.vehicleId)).size,
    materials: materials.length,
    densities: densities.size,
    errors: validation?.errors?.length || 0,
  }
}

export function sourceRowDistribution(decodingState, document, row) {
  const balances = densityBalanceRows(decodingState, document, row)
  return {
    balances,
    opening: decimalNumber(sourceTotalsByDensity(balances, 'start')) || 0,
    received: decimalNumber(sourceTotalsByDensity(balances, 'received')) || 0,
    spent: decimalNumber(distributedLiters(decodingState, document, row)) || 0,
    end: decimalNumber(sourceTotalsByDensity(balances, 'end')) || 0,
    allocations: allocationsForRow(decodingState, document, row),
    movements: movementsForRow(decodingState, document, row),
  }
}
