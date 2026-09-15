export function matKey(value) {
  return String(value ?? '')
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/^масло\s+/i, '')
    .replace(/^дт(?=\s|$)/i, 'ДТ')
    .trim()
    .toLowerCase()
}

export function canonicalMaterial(rawName, catalog) {
  const materialKey = matKey(rawName)

  for (const material of catalog || []) {
    const materialNames = [material.name, ...(material.aliases || [])]
    if (materialNames.some(alias => matKey(alias) === materialKey)) {
      return { name: material.name, unknown: false }
    }
  }

  const cleanName = String(rawName || '')
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^дт\b/i.test(cleanName)) {
    return {
      name: cleanName.replace(/^дт(?=\s|$)/i, 'ДТ'),
      unknown: true,
    }
  }
  if (/^масло\s+/i.test(cleanName)) {
    return {
      name: cleanName.replace(/^масло\s+/i, 'Масло '),
      unknown: true,
    }
  }
  return { name: `Масло ${cleanName}`, unknown: true }
}

export function parseMaterialCell(text, catalog, unknownMaterials) {
  const quantitiesByMaterial = {}

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const quantityMatch = line.match(/^([+-]?\d+(?:[.,]\d+)?)\s+(.+)$/)
    if (!quantityMatch) continue

    const quantity = Number(quantityMatch[1].replace(',', '.'))
    if (!Number.isFinite(quantity)) continue

    const material = canonicalMaterial(quantityMatch[2], catalog)
    quantitiesByMaterial[material.name] = quantity
    if (material.unknown) unknownMaterials.add(material.name)
  }

  return quantitiesByMaterial
}

export function numCell(value) {
  const numberValue = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(numberValue) ? numberValue : null
}
