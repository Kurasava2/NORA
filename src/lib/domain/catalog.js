import { BASE_CATALOG, clone, unique } from './defaults.js'

const CATALOG_INDEX_CACHE = new WeakMap()

export function normalizeCatalogName(name) {
  return String(name || '').replace(/^ДТ(?=\s|$)/i, 'Дт')
}

export function mergeCatalog(existingCatalog = [], includeBase = true) {
  const materialsByNormalizedName = new Map()

  if (includeBase) {
    for (const baseMaterial of BASE_CATALOG) {
      const material = clone(baseMaterial)
      material.name = normalizeCatalogName(material.name)
      material.aliases = unique([...(material.aliases || []), baseMaterial.name])
      materialsByNormalizedName.set(material.name.toLowerCase(), material)
    }
  }

  for (const existingMaterial of existingCatalog) {
    const material = clone(existingMaterial)
    const normalizedName = normalizeCatalogName(material.name)
    const lookupKey = normalizedName.toLowerCase()
    const currentMaterial = materialsByNormalizedName.get(lookupKey)

    materialsByNormalizedName.set(
      lookupKey,
      currentMaterial
        ? {
            ...currentMaterial,
            ...material,
            name: normalizedName,
            aliases: unique([
              ...(currentMaterial.aliases || []),
              ...(material.aliases || []),
              existingMaterial.name,
            ]),
          }
        : { ...material, name: normalizedName },
    )
  }

  return [...materialsByNormalizedName.values()]
}

function catalogIndex(catalog) {
  let cachedIndex = CATALOG_INDEX_CACHE.get(catalog)
  if (cachedIndex) return cachedIndex

  const byName = new Map()
  const byAlias = new Map()

  for (const material of catalog || []) {
    byName.set(material.name, material)
    for (const alias of material.aliases || []) byAlias.set(alias, material)
  }

  cachedIndex = { byName, byAlias }
  CATALOG_INDEX_CACHE.set(catalog, cachedIndex)
  return cachedIndex
}

export function materialOf(state, name) {
  const normalizedName = normalizeCatalogName(name)
  const index = catalogIndex(state.catalog)

  return (
    index.byName.get(normalizedName) ||
    index.byAlias.get(name) || {
      name: normalizedName,
      category: /^Д[тТ](?=\s|$)/.test(normalizedName) ? 'Топливо' : 'Масло',
      unit: 'л',
      aliases: [],
    }
  )
}

export function materialDisplayName(name) {
  return normalizeCatalogName(name)
}

export function materialCellName(name) {
  return normalizeCatalogName(name).replace(/^Масло\s+/i, '')
}

export function materialSummaryName(name) {
  return materialCellName(name)
}
