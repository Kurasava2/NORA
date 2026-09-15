import { distributedLiters, lotRemaining } from './allocations.js'
import { decimalCompare, decimalNumber, decimalSubtract } from './decimal.js'

function differs(leftValue, rightValue, tolerance) {
  const difference = decimalNumber(decimalSubtract(String(leftValue), String(rightValue)))
  return difference === null || Math.abs(difference) > tolerance
}

export function validateDecoding(decodingState, document, tolerance = 0.05) {
  const errors = []
  const warnings = []
  if (!document) return { errors: ['Расшифровка не сформирована.'], warnings, ok: false }

  for (const row of document.sourceSnapshot.rows || []) {
    const expectedEnd =
      Number(row.start) + Number(row.received) - Number(row.surrendered || 0) - Number(row.spent)
    if (Math.abs(expectedEnd - Number(row.end)) > tolerance) {
      errors.push(`${row.vehicleShortNo} · ${row.materialName}: не сходится исходный баланс.`)
    }

    const distributed = distributedLiters(decodingState, document.id, row)
    if (differs(distributed, row.spent, tolerance)) {
      const delta = decimalSubtract(String(row.spent), distributed)
      const action = decimalCompare(delta, '0') === -1 ? 'распределено лишних' : 'не распределено'
      errors.push(`${row.vehicleShortNo} · ${row.materialName}: ${action} ${Math.abs(Number(delta))} л.`)
    }
  }

  for (const lot of decodingState.densityLots || []) {
    const remaining = lotRemaining(decodingState, lot.id)
    if (remaining !== null && decimalCompare(remaining, '0') === -1) {
      errors.push(
        `${lot.materialName} · ρ ${lot.density}: партия перерасходована на ${decimalSubtract('0', remaining)} л.`,
      )
    }
  }

  for (const allocation of decodingState.allocations || []) {
    if (allocation.decodingId !== document.id) continue
    const sourceRowExists = document.sourceSnapshot.rows.some(
      sourceRow =>
        sourceRow.statementId === allocation.statementId &&
        sourceRow.materialName === allocation.materialName,
    )
    if (!sourceRowExists) warnings.push('Есть распределение без соответствующей строки ведомости.')
  }

  return { errors, warnings, ok: errors.length === 0 }
}
