export function num(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null
  }
  const parsedNumber = Number(String(value).replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(parsedNumber) ? parsedNumber : null
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function toleranceOf(value, fallback = 0.05) {
  const parsedTolerance = num(value)
  const safeFallback = Math.max(0, num(fallback) ?? 0.05)
  return parsedTolerance === null ? safeFallback : Math.max(0, parsedTolerance)
}

export function isNonZero(value, tolerance = 0.05) {
  const parsedNumber = num(value)
  return (
    parsedNumber !== null && Math.abs(parsedNumber) > toleranceOf(tolerance)
  )
}
