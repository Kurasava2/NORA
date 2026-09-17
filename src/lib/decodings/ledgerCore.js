import {
  DENSITY_ENTRY_RECEIPT,
  DENSITY_ENTRY_SPENT,
  DENSITY_ENTRY_SURRENDERED,
} from './model.js'
import {
  decimalAdd,
  decimalCanonical,
  decimalCompare,
  decimalSubtract,
} from './decimal.js'
import { entriesForRow, sumEntriesByDensity } from './entries.js'
import { autoAllocateDensity } from './ledgerAllocate.js'

function mapValue(values, density) {
  return values.get(density) || '0'
}

function addMaps(...maps) {
  const densities = new Set()
  for (const values of maps) for (const density of values.keys()) densities.add(density)
  return densities
}

function manualAllocation(opening, receipts, surrendered, manualSpent) {
  const received = sumEntriesByDensity(receipts)
  const surrenderedTotals = sumEntriesByDensity(surrendered)
  const spent = sumEntriesByDensity(manualSpent)
  const balances = new Map(opening)
  const issues = []
  const densities = addMaps(opening, received, surrenderedTotals, spent)

  for (const density of densities) {
    const available = decimalAdd(mapValue(opening, density), mapValue(received, density))
    const afterSurrender = decimalSubtract(available, mapValue(surrenderedTotals, density))
    const end = decimalSubtract(afterSurrender, mapValue(spent, density))
    balances.set(density, end)
    if (decimalCompare(end, '0') === -1) {
      issues.push(`ρ ${density}: ручное распределение превышает доступный объём на ${decimalSubtract('0', end)} л.`)
    }
  }

  return { balances, received, surrendered: surrenderedTotals, spent, issues, manual: true }
}

function normShares(rows, norm, totalSpent) {
  if (norm === null || norm === undefined) return rows.map(() => null)
  if (Math.abs(Number(norm) - Number(totalSpent || 0)) <= 0.000001) {
    return rows.map(row => row.spent)
  }
  const spentNumber = Number(totalSpent || 0)
  if (!spentNumber) return rows.map(() => '0')

  let assigned = 0
  return rows.map((row, index) => {
    if (index === rows.length - 1) return decimalCanonical(Number(norm) - assigned, '0')
    const share = Number(norm) * Number(row.spent || 0) / spentNumber
    const stable = Math.round(share * 1e9) / 1e9
    assigned += stable
    return decimalCanonical(stable, '0')
  })
}

export function buildSourceDensityRows(decodingState, document, row, opening) {
  const periodId = document.periodId
  const receipts = entriesForRow(decodingState, periodId, row, DENSITY_ENTRY_RECEIPT)
  const surrendered = entriesForRow(decodingState, periodId, row, DENSITY_ENTRY_SURRENDERED)
  const manualSpent = entriesForRow(decodingState, periodId, row, DENSITY_ENTRY_SPENT)
  const allocation = manualSpent.length
    ? manualAllocation(opening, receipts, surrendered, manualSpent)
    : autoAllocateDensity({ opening, row, receipts, surrendered })
  const densities = addMaps(
    opening,
    allocation.received,
    allocation.surrendered,
    allocation.spent,
    allocation.balances,
  )
  const rows = [...densities]
    .sort((leftDensity, rightDensity) => Number(leftDensity) - Number(rightDensity))
    .map(density => ({
      density,
      start: mapValue(opening, density),
      received: mapValue(allocation.received, density),
      surrendered: mapValue(allocation.surrendered, density),
      spent: mapValue(allocation.spent, density),
      norm: null,
      end: mapValue(allocation.balances, density),
    }))
    .filter(densityRow =>
      [densityRow.start, densityRow.received, densityRow.surrendered, densityRow.spent, densityRow.end]
        .some(value => decimalCompare(value, '0') !== 0),
    )
  const norms = normShares(rows, row.norm, row.spent)
  rows.forEach((densityRow, index) => {
    densityRow.norm = norms[index]
    densityRow.variance = densityRow.norm === null
      ? null
      : decimalSubtract(densityRow.norm, densityRow.spent)
  })

  return { rows, issues: allocation.issues, manual: Boolean(manualSpent.length) }
}
