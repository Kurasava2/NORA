export function tripBelongsToPeriod(trip, period) {
  const date = String(trip?.date || '')
  const start = String(period?.start || '')
  const end = String(period?.end || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false
  return date >= start && date <= end
}
