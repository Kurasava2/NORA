import { createStyleReader } from './styles.js'
import {
  cellReferenceParts,
  cellText,
  elementsByLocalName,
  excelSerialIso,
  parseXml,
  rangeReferenceParts,
  sharedStrings,
  workbookEntries,
} from './xml.js'
import { buildTableBody } from './tableBody.js'

function displayCell(cell, sharedStringValues, style) {
  const rawValue = cellText(cell, sharedStringValues)
  if (style.isDate && /^\d+(?:\.\d+)?$/.test(rawValue)) {
    const isoDate = excelSerialIso(rawValue)
    if (isoDate) {
      const [year, month, day] = isoDate.split('-')
      return `${day}.${month}.${year}`
    }
  }
  return rawValue
}

function collectCells(sheetDocument, dimensions) {
  let maxRow = dimensions?.r2 || 0
  let maxColumn = dimensions?.c2 || 0
  const cells = new Map()

  for (const cell of elementsByLocalName(sheetDocument, 'c')) {
    const position = cellReferenceParts(cell.getAttribute('r'))
    if (!position) continue

    cells.set(`${position.row}:${position.col}`, cell)
    maxRow = Math.max(maxRow, position.row)
    maxColumn = Math.max(maxColumn, position.col)
  }

  return { cells, maxRow, maxColumn }
}

function collectMergedCells(sheetDocument) {
  const mergeTopLeft = new Map()
  const coveredCells = new Set()

  const mergedRanges = elementsByLocalName(sheetDocument, 'mergeCell')
    .map(mergeCell => rangeReferenceParts(mergeCell.getAttribute('ref')))
    .filter(Boolean)

  for (const mergedRange of mergedRanges) {
    mergeTopLeft.set(`${mergedRange.r1}:${mergedRange.c1}`, mergedRange)
    for (let row = mergedRange.r1; row <= mergedRange.r2; row += 1) {
      for (let column = mergedRange.c1; column <= mergedRange.c2; column += 1) {
        if (row !== mergedRange.r1 || column !== mergedRange.c1) {
          coveredCells.add(`${row}:${column}`)
        }
      }
    }
  }

  return { mergeTopLeft, coveredCells }
}

function columnWidths(sheetDocument, maxColumn) {
  const widths = Array(maxColumn).fill(10)

  for (const columnNode of elementsByLocalName(sheetDocument, 'col')) {
    const firstColumn = Number(columnNode.getAttribute('min') || 1)
    const lastColumn = Number(columnNode.getAttribute('max') || firstColumn)
    const width = Number(columnNode.getAttribute('width') || 10)

    for (
      let column = Math.max(1, firstColumn);
      column <= Math.min(maxColumn, lastColumn);
      column += 1
    ) {
      widths[column - 1] = columnNode.getAttribute('hidden') === '1' ? 0.01 : width
    }
  }

  return widths
}

function buildColumnGroup(widths) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) || 1
  const columns = widths
    .map(width => `<col style="width:${((width / totalWidth) * 100).toFixed(4)}%">`)
    .join('')

  return `<colgroup>${columns}</colgroup>`
}

export function sheetHtml(files) {
  const sharedStringValues = sharedStrings(files)
  const firstSheet = workbookEntries(files)[0]
  if (!firstSheet) throw new Error('В сформированном XLSX нет листа для предпросмотра.')

  const sheetDocument = parseXml(files.get(firstSheet.path))
  const styleOf = createStyleReader(files)
  const rows = elementsByLocalName(sheetDocument, 'row')
  const dimensions = rangeReferenceParts(
    elementsByLocalName(sheetDocument, 'dimension')[0]?.getAttribute('ref') || '',
  )
  const cellData = collectCells(sheetDocument, dimensions)
  const maxRow = Math.max(
    cellData.maxRow,
    ...rows.map(row => Number(row.getAttribute('r') || 0)),
    1,
  )
  const maxColumn = Math.max(cellData.maxColumn, 1)
  const mergedCells = collectMergedCells(sheetDocument)
  const widths = columnWidths(sheetDocument, maxColumn)
  const columnGroup = buildColumnGroup(widths)
  const body = buildTableBody({
    sheetDocument,
    rows,
    cells: cellData.cells,
    maxRow,
    maxColumn,
    mergeTopLeft: mergedCells.mergeTopLeft,
    coveredCells: mergedCells.coveredCells,
    styleOf,
    sharedStringValues,
    displayCell,
  })

  return `<div class="xlsx-sheet-wrap"><table class="xlsx-sheet">${columnGroup}<tbody>${body}</tbody></table></div>`
}
