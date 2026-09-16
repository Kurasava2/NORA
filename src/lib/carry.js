import { smartBalance } from './calculations.js'
import { num, toleranceOf } from './numbers.js'

export function syncCarriedStart(entry, previousEnd, tolerance = 0.05) {
  const quantityEntry = entry && typeof entry === 'object' ? entry : null
  if (!quantityEntry?._carried) return quantityEntry

  const previousEndValue = num(previousEnd)
  if (
    previousEndValue === null ||
    Math.abs(previousEndValue) <= toleranceOf(tolerance)
  ) {
    return quantityEntry
  }

  quantityEntry.start = previousEndValue
  const autoTarget = quantityEntry._autoTarget || ''
  if (autoTarget && autoTarget !== 'start') {
    Object.assign(quantityEntry, smartBalance(quantityEntry, autoTarget))
  }
  if (autoTarget === 'start') quantityEntry._autoTarget = ''
  return quantityEntry
}
