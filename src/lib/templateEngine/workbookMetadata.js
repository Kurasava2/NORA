import {
  PACKAGE_RELATIONSHIP_NAMESPACE,
  RELATIONSHIP_NAMESPACE,
  XML_NAMESPACE,
  elems,
  serialize,
  xml,
} from './xml.js'

const CONTENT_TYPES_NAMESPACE =
  'http://schemas.openxmlformats.org/package/2006/content-types'
const WORKSHEET_RELATIONSHIP_TYPE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
const WORKSHEET_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'

export function safeSheetName(name, sheetNumber) {
  const cleanedName = String(name || `Ведомость ${sheetNumber}`)
    .replace(/[\\\/?*\[\]:]/g, ' ')
    .trim()
  return (cleanedName || `Ведомость ${sheetNumber}`).slice(0, 31)
}

export function sheetRelPath(sheetPath) {
  const pathMatch = String(sheetPath).match(/^xl\/worksheets\/(.+\.xml)$/)
  return pathMatch
    ? `xl/worksheets/_rels/${pathMatch[1]}.rels`
    : null
}

function updateWorkbookSheets(files, renderedSheets) {
  const workbookDocument = xml(files.get('xl/workbook.xml'))
  const sheetsNode = elems(workbookDocument, 'sheets')[0]
  while (sheetsNode.firstChild) sheetsNode.removeChild(sheetsNode.firstChild)

  renderedSheets.forEach((renderedSheet, sheetIndex) => {
    const sheetNode = workbookDocument.createElementNS(XML_NAMESPACE, 'sheet')
    const sheetNumber = sheetIndex + 1
    sheetNode.setAttribute(
      'name',
      safeSheetName(
        renderedSheet.model.name || renderedSheet.model.shortNo,
        sheetNumber,
      ),
    )
    sheetNode.setAttribute('sheetId', String(sheetNumber))
    sheetNode.setAttributeNS(
      RELATIONSHIP_NAMESPACE,
      'r:id',
      `rIdGSM${sheetNumber}`,
    )
    sheetsNode.appendChild(sheetNode)
  })

  const definedNames = elems(workbookDocument, 'definedNames')[0]
  if (definedNames) definedNames.parentNode.removeChild(definedNames)

  for (const workbookView of elems(workbookDocument, 'workbookView')) {
    workbookView.setAttribute('firstSheet', '0')
    workbookView.setAttribute('activeTab', '0')
  }

  files.set('xl/workbook.xml', serialize(workbookDocument))
}

function updateWorkbookRelationships(files, renderedSheets) {
  const relationshipDocument = xml(files.get('xl/_rels/workbook.xml.rels'))
  const relationshipRoot = relationshipDocument.documentElement

  for (const relationship of elems(relationshipDocument, 'Relationship')) {
    const relationshipType = relationship.getAttribute('Type') || ''
    if (
      relationshipType.endsWith('/worksheet') ||
      relationshipType.endsWith('/calcChain')
    ) {
      relationship.parentNode.removeChild(relationship)
    }
  }

  renderedSheets.forEach((renderedSheet, sheetIndex) => {
    const sheetNumber = sheetIndex + 1
    const relationship = relationshipDocument.createElementNS(
      PACKAGE_RELATIONSHIP_NAMESPACE,
      'Relationship',
    )
    relationship.setAttribute('Id', `rIdGSM${sheetNumber}`)
    relationship.setAttribute('Type', WORKSHEET_RELATIONSHIP_TYPE)
    relationship.setAttribute('Target', `worksheets/sheet${sheetNumber}.xml`)
    relationshipRoot.appendChild(relationship)
  })

  files.set(
    'xl/_rels/workbook.xml.rels',
    serialize(relationshipDocument),
  )
}

function updateContentTypes(files, renderedSheets) {
  files.delete('xl/calcChain.xml')

  const contentTypesDocument = xml(files.get('[Content_Types].xml'))
  const contentTypesRoot = contentTypesDocument.documentElement

  for (const overrideNode of elems(contentTypesDocument, 'Override')) {
    if (overrideNode.getAttribute('PartName') === '/xl/calcChain.xml') {
      overrideNode.parentNode.removeChild(overrideNode)
    }
  }

  renderedSheets.forEach((renderedSheet, sheetIndex) => {
    const sheetNumber = sheetIndex + 1
    const partName = `/xl/worksheets/sheet${sheetNumber}.xml`
    const alreadyDeclared = elems(contentTypesDocument, 'Override').some(
      overrideNode => overrideNode.getAttribute('PartName') === partName,
    )
    if (alreadyDeclared) return

    const overrideNode = contentTypesDocument.createElementNS(
      CONTENT_TYPES_NAMESPACE,
      'Override',
    )
    overrideNode.setAttribute('PartName', partName)
    overrideNode.setAttribute('ContentType', WORKSHEET_CONTENT_TYPE)
    contentTypesRoot.appendChild(overrideNode)
  })

  files.set('[Content_Types].xml', serialize(contentTypesDocument))
}

export function updateWorkbook(files, renderedSheets) {
  updateWorkbookSheets(files, renderedSheets)
  updateWorkbookRelationships(files, renderedSheets)
  updateContentTypes(files, renderedSheets)
}
