import { periodYear } from './domain.js'

export function groupPeriods(periods) {
  const periodsByYear = new Map()

  for (const period of periods) {
    const year = periodYear(period) || 'Без года'
    if (!periodsByYear.has(year)) periodsByYear.set(year, [])
    periodsByYear.get(year).push(period)
  }

  return [...periodsByYear.entries()].sort(
    ([firstYear], [secondYear]) => Number(secondYear) - Number(firstYear),
  )
}
