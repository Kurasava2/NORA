import { num, toleranceOf } from './numbers.js'

export function syncCarriedStart(entry, previousEnd, tolerance = 0.05) {
  const q = entry && typeof entry === 'object' ? entry : null
  if (!q?._carried) return q
  const end = num(previousEnd)
  if (end === null || Math.abs(end) <= toleranceOf(tolerance)) return q
  q.start = end
  return q
}
