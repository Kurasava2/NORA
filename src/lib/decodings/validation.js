import {
  DENSITY_ENTRY_RECEIPT,
} from './model.js'
import {
  decimalNumber,
  decimalSubtract,
  decimalSum,
} from './decimal.js'
import { entriesForRow } from './entries.js'
import { buildMaterialLedger } from './ledger.js'

function differs(leftValue, rightValue, tolerance) {
  const difference = decimalNumber(decimalSubtract(String(leftValue), String(rightValue)))
  return difference === null || Math.abs(difference) > tolerance
}

function sumField(rows, fieldName) {
  return decimalSum((rows || []).map(row => row[fieldName] ?? '0'))
}

function differenceMessage(expected, actual) {
  const delta = decimalNumber(decimalSubtract(String(expected), String(actual))) || 0
  return delta > 0
    ? `не распределено ${Math.abs(delta)} л`
    : `распределено лишних ${Math.abs(delta)} л`
}

function validateReceiptTrips(decodingState, document, sourceRow, tolerance, errors, warnings) {
  const receipts = entriesForRow(
    decodingState,
    document.periodId,
    sourceRow,
    DENSITY_ENTRY_RECEIPT,
  )
  const sourceTrips = sourceRow.trips || []

  for (const trip of sourceTrips) {
    const linked = receipts.filter(entry => entry.tripId === trip.tripId)
    if (!linked.length && Number(trip.received || 0) === 0) continue
    const actual = decimalSum(linked.map(entry => entry.liters))
    if (differs(actual, trip.received || 0, tolerance)) {
      errors.push(
        `${sourceRow.vehicleShortNo} · ${sourceRow.materialName} · путёвка №${trip.number || '—'}: ` +
        `${differenceMessage(trip.received || 0, actual)} по раздаточной.`,
      )
    }
  }

  const knownTripIds = new Set(sourceTrips.map(trip => trip.tripId))
  for (const receipt of receipts) {
    if (receipt.tripId && !knownTripIds.has(receipt.tripId)) {
      warnings.push(
        `${sourceRow.vehicleShortNo} · ${sourceRow.materialName}: выдача №${receipt.waybillNumber || '—'} ` +
        'не привязана к путёвке текущего снимка.',
      )
    }
  }
}

function validateSourceRow(state, document, sourceRow, ledgerRows, tolerance, errors, warnings) {
  const expectedEnd =
    Number(sourceRow.start) + Number(sourceRow.received) -
    Number(sourceRow.surrendered || 0) - Number(sourceRow.spent)
  if (Math.abs(expectedEnd - Number(sourceRow.end)) > tolerance) {
    errors.push(`${sourceRow.vehicleShortNo} · ${sourceRow.materialName}: не сходится исходная ведомость.`)
  }

  const checks = [
    ['start', 'sourceStart', sourceRow.start, 'начало'],
    ['received', 'sourceReceived', sourceRow.received, 'получено'],
    ['spent', 'sourceSpent', sourceRow.spent, 'расход'],
    ['end', 'sourceEnd', sourceRow.end, 'остаток'],
  ]
  for (const [fieldName, , expected, label] of checks) {
    const actual = sumField(ledgerRows, fieldName)
    if (differs(actual, expected || 0, tolerance)) {
      errors.push(
        `${sourceRow.vehicleShortNo} · ${sourceRow.materialName}: ${label} — ` +
        `${differenceMessage(expected || 0, actual)} по плотностям.`,
      )
    }
  }

  if (sourceRow.norm !== null) {
    const norm = sumField(ledgerRows, 'norm')
    if (differs(norm, sourceRow.norm, tolerance)) {
      warnings.push(`${sourceRow.vehicleShortNo} · ${sourceRow.materialName}: норма по плотностям не совпадает.`)
    }
  }
  validateReceiptTrips(state.decoding, document, sourceRow, tolerance, errors, warnings)
}

export function validateDecoding(state, document, tolerance = 0.05) {
  const errors = []
  const warnings = []
  if (!document) return { errors: ['Расшифровка не сформирована.'], warnings, ok: false }
  const materials = [...new Set((document.sourceSnapshot?.rows || []).map(row => row.materialName))]

  for (const materialName of materials) {
    const ledger = buildMaterialLedger(state, document, materialName)
    for (const issue of ledger.issues) {
      errors.push(`${issue.sourceRow.vehicleShortNo} · ${materialName}: ${issue.message}`)
    }
    const sourceRows = document.sourceSnapshot.rows.filter(row => row.materialName === materialName)
    for (const sourceRow of sourceRows) {
      const rows = ledger.rows.filter(row => row.statementId === sourceRow.statementId)
      validateSourceRow(state, document, sourceRow, rows, tolerance, errors, warnings)
    }
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], ok: errors.length === 0 }
}
