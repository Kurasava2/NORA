import { decimalCompare, decimalNumber, decimalSubtract } from './decimal.js'
import {
  densityBalanceRows,
  distributedLiters,
  sourceTotalsByDensity,
} from './balances.js'

function difference(leftValue, rightValue) {
  const value = decimalNumber(decimalSubtract(String(leftValue || 0), String(rightValue || 0)))
  return value === null ? Infinity : value
}

function mismatch(leftValue, rightValue, tolerance) {
  return Math.abs(difference(leftValue, rightValue)) > tolerance
}

function valueLabel(value) {
  const number = Math.abs(Number(value || 0))
  return Number.isFinite(number) ? number : value
}

function validateSourceRow(decodingState, document, row, tolerance, errors) {
  const expectedEnd =
    Number(row.start) + Number(row.received) - Number(row.surrendered || 0) - Number(row.spent)
  const label = `${row.vehicleShortNo} · ${row.materialName}`
  if (Math.abs(expectedEnd - Number(row.end)) > tolerance) {
    errors.push(`${label}: не сходится исходная автомобильная ведомость.`)
  }

  const balances = densityBalanceRows(decodingState, document, row)
  const opening = sourceTotalsByDensity(balances, 'start')
  const received = sourceTotalsByDensity(balances, 'received')
  const surrendered = sourceTotalsByDensity(balances, 'surrendered')
  const spent = distributedLiters(decodingState, document, row)
  const end = sourceTotalsByDensity(balances, 'end')

  if (mismatch(opening, row.start, tolerance)) {
    errors.push(`${label}: начальный остаток по плотностям отличается на ${valueLabel(difference(row.start, opening))} л.`)
  }
  if (mismatch(received, row.received, tolerance)) {
    errors.push(`${label}: получение по раздаточной отличается на ${valueLabel(difference(row.received, received))} л.`)
  }
  if (mismatch(surrendered, row.surrendered || 0, tolerance)) {
    errors.push(`${label}: сдано/слито по плотностям не совпадает с ведомостью.`)
  }
  if (mismatch(spent, row.spent, tolerance)) {
    errors.push(`${label}: расход по плотностям отличается на ${valueLabel(difference(row.spent, spent))} л.`)
  }
  if (mismatch(end, row.end, tolerance)) {
    errors.push(`${label}: конечный остаток по плотностям отличается на ${valueLabel(difference(row.end, end))} л.`)
  }

  for (const balance of balances) {
    if (decimalCompare(balance.end, '0') === -1) {
      errors.push(`${label} · ρ ${balance.density}: отрицательный остаток ${balance.end} л.`)
    }
  }
}

export function validateDecoding(decodingState, document, tolerance = 0.05) {
  const errors = []
  const warnings = []
  if (!document) return { errors: ['Расшифровка не сформирована.'], warnings, ok: false }

  for (const row of document.sourceSnapshot.rows || []) {
    validateSourceRow(decodingState, document, row, tolerance, errors)
  }

  const legacyLots = decodingState?.legacyDensityLots || []
  if (legacyLots.length) {
    warnings.push(
      `Сохранено ${legacyLots.length} записей прежнего формата. Они не участвуют в новой расшифровке.`,
    )
  }

  for (const movement of decodingState?.densityMovements || []) {
    if (movement.periodId !== document.periodId) continue
    if (decimalCompare(movement.liters, '0') !== 1) {
      errors.push('Есть запись раздаточной ведомости с неположительным объёмом.')
    }
    if (decimalCompare(movement.density, '0') !== 1) {
      errors.push('Есть запись раздаточной ведомости с некорректной плотностью.')
    }
  }

  return { errors, warnings, ok: errors.length === 0 }
}
