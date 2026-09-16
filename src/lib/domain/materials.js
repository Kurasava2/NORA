import { isNonZero } from '../numbers.js'
import { sortTripsInPlace } from '../trips.js'

const MATERIAL_PRIORITY = new Map([
  ['ДТЗ', 0],
  ['ДТА', 1],
  ['МАСЛОР', 0],
  ['МАСЛОМ10Г2', 1],
  ['МАСЛОМ414Д', 2],
  ['МАСЛОМ4З14Д', 3],
])

function normalizedMaterialName(materialName) {
  return String(materialName || '')
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/[^A-ZА-Я0-9]/g, '')
}

function materialCategoryRank(state, materialName) {
  const catalogMaterial = (state?.catalog || []).find(material => material.name === materialName)
  const category = String(catalogMaterial?.category || '').toLowerCase()
  if (category.includes('топлив')) return 0
  if (category.includes('масл')) return 1

  const normalizedName = normalizedMaterialName(materialName)
  if (normalizedName.startsWith('ДТ')) return 0
  if (normalizedName.startsWith('МАСЛ')) return 1
  return 2
}

export function orderedMaterialNames(state, materialNames) {
  return [...new Set(materialNames || [])].sort((firstName, secondName) => {
    const categoryDifference =
      materialCategoryRank(state, firstName) - materialCategoryRank(state, secondName)
    if (categoryDifference) return categoryDifference

    const firstPriority = MATERIAL_PRIORITY.get(normalizedMaterialName(firstName)) ?? 100
    const secondPriority = MATERIAL_PRIORITY.get(normalizedMaterialName(secondName)) ?? 100
    return firstPriority - secondPriority || firstName.localeCompare(secondName, 'ru')
  })
}

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
