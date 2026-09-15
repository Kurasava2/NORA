import { num, round2 } from './numbers.js'

export function smartBalance(entry, target) {
  const balancedEntry = { ...entry }
  const values = {
    start: num(balancedEntry.start),
    received: num(balancedEntry.received),
    spent: num(balancedEntry.spent),
    end: num(balancedEntry.end),
  }
  const otherValues = Object.entries(values).filter(
    ([fieldName]) => fieldName !== target,
  )
  if (!target || !otherValues.every(([, value]) => value !== null)) {
    return balancedEntry
  }

  if (target === 'end') {
    balancedEntry.end = round2(values.start + values.received - values.spent)
  }
  if (target === 'spent') {
    balancedEntry.spent = round2(values.start + values.received - values.end)
  }
  if (target === 'received') {
    balancedEntry.received = round2(values.end - values.start + values.spent)
  }
  if (target === 'start') {
    balancedEntry.start = round2(values.end - values.received + values.spent)
  }
  balancedEntry._autoTarget = target
  return balancedEntry
}
