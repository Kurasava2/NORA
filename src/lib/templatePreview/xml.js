const TEXT_DECODER = new TextDecoder('utf-8')
const RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

export const elementsByLocalName = (node, name) => [
  ...node.getElementsByTagNameNS('*', name),
]

export function parseXml(bytes) {
  const document = new DOMParser().parseFromString(
    TEXT_DECODER.decode(bytes),
    'application/xml',
  )
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('Повреждён XML внутри XLSX.')
  }
  return document
}

function normalizeTarget(target) {
  const normalizedTarget = String(target || '').replace(/\\/g, '/')
  if (normalizedTarget.startsWith('/')) return normalizedTarget.slice(1)
  if (normalizedTarget.startsWith('xl/')) return normalizedTarget
  return `xl/${normalizedTarget.replace(/^\.\//, '')}`
}

export function sharedStrings(files) {
  const sharedStringsBytes = files.get('xl/sharedStrings.xml')
  if (!sharedStringsBytes) return []

  return elementsByLocalName(parseXml(sharedStringsBytes), 'si').map(sharedString =>
    elementsByLocalName(sharedString, 't')
      .map(textNode => textNode.textContent || '')
      .join(''),
  )
}

export function cellText(cell, sharedStringValues) {
  const cellType = cell.getAttribute('t') || ''

  if (cellType === 's') {
    const valueNode = elementsByLocalName(cell, 'v')[0]
    return valueNode ? sharedStringValues[Number(valueNode.textContent)] ?? '' : ''
  }

  if (cellType === 'inlineStr') {
    return elementsByLocalName(cell, 't')
      .map(textNode => textNode.textContent || '')
      .join('')
  }

  const valueNode = elementsByLocalName(cell, 'v')[0]
  return valueNode ? valueNode.textContent || '' : ''
}

export function workbookEntries(files) {
  const workbookBytes = files.get('xl/workbook.xml')
  const relationshipBytes = files.get('xl/_rels/workbook.xml.rels')
  if (!workbookBytes || !relationshipBytes) return []

  const workbookDocument = parseXml(workbookBytes)
  const relationshipDocument = parseXml(relationshipBytes)
  const relationshipTargets = new Map(
    elementsByLocalName(relationshipDocument, 'Relationship').map(relationship => [
      relationship.getAttribute('Id'),
      normalizeTarget(relationship.getAttribute('Target')),
    ]),
  )

  return elementsByLocalName(workbookDocument, 'sheet')
    .map((sheet, sheetIndex) => {
      const relationshipId =
        sheet.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') || sheet.getAttribute('r:id')
      return {
        name: sheet.getAttribute('name') || `Sheet${sheetIndex + 1}`,
        path: relationshipTargets.get(relationshipId) || null,
      }
    })
    .filter(entry => entry.path && files.has(entry.path))
}

export function cellReferenceParts(reference) {
  const match = String(reference || '').match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null

  let column = 0
  for (const character of match[1].toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64
  }

  return { col: column, row: Number(match[2]) }
}

export function rangeReferenceParts(reference) {
  const [startReference, endReference = startReference] = String(reference || '').split(':')
  const start = cellReferenceParts(startReference)
  const end = cellReferenceParts(endReference)

  return start && end
    ? {
        c1: Math.min(start.col, end.col),
        c2: Math.max(start.col, end.col),
        r1: Math.min(start.row, end.row),
        r2: Math.max(start.row, end.row),
      }
    : null
}

export function excelSerialIso(value) {
  const serialNumber = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(serialNumber) || serialNumber < 1) return ''

  return new Date(
    Date.UTC(1899, 11, 30) + Math.floor(serialNumber) * 86400000,
  )
    .toISOString()
    .slice(0, 10)
}

export function htmlEscape(value) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return String(value ?? '').replace(/[&<>"']/g, character => replacements[character])
}
