import {
  decimalAdd,
  decimalCanonical,
  decimalCompare,
  decimalSubtract,
} from './decimal.js'
import { positiveMapEntries, sumEntriesByDensity } from './entries.js'

function addToMap(target, density, liters) {
  const amount = decimalCanonical(liters, '0')
  target.set(density, decimalAdd(target.get(density) || '0', amount))
}

function takeFromDensity(balances, density, liters) {
  const available = balances.get(density) || '0'
  const requested = decimalCanonical(liters, '0')
  const enough = decimalCompare(available, requested) >= 0
  const used = enough ? requested : available
  balances.set(density, decimalSubtract(available, used))
  return { used, shortage: decimalSubtract(requested, used) }
}

function spendMinimized(balances, liters) {
  let remaining = decimalCanonical(liters, '0')
  const spent = new Map()

  while (decimalCompare(remaining, '0') === 1) {
    const available = positiveMapEntries(balances)
      .sort((leftEntry, rightEntry) => {
        const balanceOrder = decimalCompare(leftEntry[1], rightEntry[1])
        return balanceOrder || Number(leftEntry[0]) - Number(rightEntry[0])
      })
    if (!available.length) break

    const [density, current] = available[0]
    const useAll = decimalCompare(current, remaining) <= 0
    const used = useAll ? current : remaining
    balances.set(density, decimalSubtract(current, used))
    addToMap(spent, density, used)
    remaining = decimalSubtract(remaining, used)
  }

  return { spent, shortage: remaining }
}

function timelineEvents(row, receipts, surrendered) {
  const tripOrder = new Map((row.trips || []).map(trip => [trip.tripId, trip.order]))
  const events = []

  for (const receipt of receipts) {
    events.push({
      type: 'receipt',
      date: receipt.date || '',
      order: tripOrder.has(receipt.tripId) ? tripOrder.get(receipt.tripId) : -1,
      priority: 0,
      density: receipt.density,
      liters: receipt.liters,
    })
  }
  for (const trip of row.trips || []) {
    if (Number(trip.spent || 0) <= 0) continue
    events.push({
      type: 'spent',
      date: trip.date || '',
      order: trip.order,
      priority: 1,
      liters: String(trip.spent),
      trip,
    })
  }
  for (const entry of surrendered) {
    events.push({
      type: 'surrendered',
      date: entry.date || '',
      order: tripOrder.has(entry.tripId) ? tripOrder.get(entry.tripId) : Number.MAX_SAFE_INTEGER,
      priority: 2,
      density: entry.density,
      liters: entry.liters,
    })
  }

  return events.sort(
    (leftEvent, rightEvent) =>
      leftEvent.date.localeCompare(rightEvent.date) ||
      leftEvent.order - rightEvent.order ||
      leftEvent.priority - rightEvent.priority,
  )
}

export function autoAllocateDensity({ opening, row, receipts, surrendered }) {
  const balances = new Map(opening)
  const received = new Map()
  const spent = new Map()
  const surrenderedTotals = new Map()
  const issues = []

  for (const event of timelineEvents(row, receipts, surrendered)) {
    if (event.type === 'receipt') {
      addToMap(balances, event.density, event.liters)
      addToMap(received, event.density, event.liters)
      continue
    }
    if (event.type === 'surrendered') {
      const result = takeFromDensity(balances, event.density, event.liters)
      addToMap(surrenderedTotals, event.density, result.used)
      if (decimalCompare(result.shortage, '0') === 1) {
        issues.push(`Недостаточно ρ ${event.density} для сдачи ${event.liters} л.`)
      }
      continue
    }

    const result = spendMinimized(balances, event.liters)
    for (const [density, liters] of result.spent) addToMap(spent, density, liters)
    if (decimalCompare(result.shortage, '0') === 1) {
      issues.push(
        `Путёвка №${event.trip.number || '—'}: не распределено ${result.shortage} л расхода.`,
      )
    }
  }

  return { balances, received, spent, surrendered: surrenderedTotals, issues }
}

export function manualSpentByDensity(entries) {
  return sumEntriesByDensity(entries)
}
