import {
  RELATIONSHIP_NAMESPACE,
  elems,
  normalizeTarget,
  xml,
} from './xml.js'

function workbookRelationshipMap(files) {
  const relationshipBytes = files.get('xl/_rels/workbook.xml.rels')
  if (!relationshipBytes) return new Map()

  const relationshipDocument = xml(relationshipBytes)
  return new Map(
    elems(relationshipDocument, 'Relationship').map(relationship => [
      relationship.getAttribute('Id'),
      normalizeTarget(relationship.getAttribute('Target')),
    ]),
  )
}

export function workbookEntries(files) {
  const workbookBytes = files.get('xl/workbook.xml')
  if (!workbookBytes || !files.get('xl/_rels/workbook.xml.rels')) return []

  const workbookDocument = xml(workbookBytes)
  const relationshipMap = workbookRelationshipMap(files)

  return elems(workbookDocument, 'sheet')
    .map((sheet, sheetIndex) => {
      const relationshipId =
        sheet.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') ||
        sheet.getAttribute('r:id')
      return {
        name: sheet.getAttribute('name') || `Sheet${sheetIndex + 1}`,
        rid: relationshipId,
        path: relationshipMap.get(relationshipId) || null,
        index: sheetIndex,
      }
    })
    .filter(entry => entry.path && files.has(entry.path))
}
