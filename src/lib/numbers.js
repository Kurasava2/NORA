export function num(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const n = Number(String(value).replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function toleranceOf(value, fallback = 0.05) {
  const parsed = num(value)
  const safeFallback = Math.max(0, num(fallback) ?? 0.05)
  return parsed === null ? safeFallback : Math.max(0, parsed)
}

export function isNonZero(value, tolerance = 0.05) {
  const n = num(value)
  return n !== null && Math.abs(n) > toleranceOf(tolerance)
}
