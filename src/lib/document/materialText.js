import { materialCellName, nfmt, nonZero, num, tripMaterialNames } from '../domain.js'

export function materialLinesText(state, trip, fieldName) {
  return tripMaterialNames(trip)
    .map(materialName => {
      const value = num(trip.gsm?.[materialName]?.[fieldName])
      if (value === null || !nonZero(state, value)) return ''
      return `${nfmt(value)} ${materialCellName(materialName)}`
    })
    .filter(Boolean)
    .join('\n')
}

export function numericTotal(value) {
  const numericValue = num(value)
  return numericValue === null ? 0 : numericValue
}
