import { isNonZero } from '../numbers.js'
import { sortTripsInPlace } from '../trips.js'

export function tripMaterialNames(trip) {
  return Object.keys(trip?.gsm || {})
}

export function statementMaterialNames(statement) {
  const materialNames = []

  for (const trip of statement?.trips || []) {
    for (const materialName of tripMaterialNames(trip)) {
      if (!materialNames.includes(materialName)) materialNames.push(materialName)
    }
  }

  return materialNames
}

export function syncStatementMaterials(statement) {
  if (statement) statement.materials = statementMaterialNames(statement)
  return statement?.materials || []
}

export function nonZero(state, value) {
  return isNonZero(value, state?.settings?.tolerance)
}

export function sortTrips(statement) {
  if (statement) sortTripsInPlace(statement.trips)
  return statement?.trips || []
}
