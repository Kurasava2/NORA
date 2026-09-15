import { XML_NAMESPACE, elems } from './xml.js'
import { rowNum, setRowNumber } from './worksheetCells.js'

export function shiftRange(reference, afterRow, delta) {
  return String(reference).replace(
    /(\$?[A-Z]{1,3}\$?)(\d+)/g,
    (match, columnPart, rowPart) => {
      const rowNumber = Number(rowPart)
      return `${columnPart}${rowNumber > afterRow ? rowNumber + delta : rowNumber}`
    },
  )
}

export function shiftAfter(document, afterRow, delta) {
  if (!delta) return

  const rowsToShift = elems(document, 'row')
    .filter(row => rowNum(row) > afterRow)
    .sort((leftRow, rightRow) =>
      delta > 0
        ? rowNum(rightRow) - rowNum(leftRow)
        : rowNum(leftRow) - rowNum(rightRow),
    )

  for (const row of rowsToShift) {
    setRowNumber(row, rowNum(row) + delta)
  }

  for (const tagName of ['mergeCell', 'hyperlink']) {
    for (const node of elems(document, tagName)) {
      const reference = node.getAttribute('ref')
      if (reference) {
        node.setAttribute('ref', shiftRange(reference, afterRow, delta))
      }
    }
  }

  const dimension = elems(document, 'dimension')[0]
  if (dimension?.getAttribute('ref')) {
    dimension.setAttribute(
      'ref',
      shiftRange(dimension.getAttribute('ref'), afterRow, delta),
    )
  }
}

export function mergeRangeRows(reference) {
  const rowNumbers = String(reference || '').match(/\d+/g)
  if (!rowNumbers?.length) return null

  const firstRow = Number(rowNumbers[0])
  const lastRow = Number(rowNumbers[rowNumbers.length - 1])
  return {
    a: Math.min(firstRow, lastRow),
    b: Math.max(firstRow, lastRow),
  }
}

export function ensureMergeCells(document) {
  let mergeCells = elems(document, 'mergeCells')[0]
  if (mergeCells) return mergeCells

  mergeCells = document.createElementNS(XML_NAMESPACE, 'mergeCells')
  const root = document.documentElement
  const sheetData = elems(document, 'sheetData')[0]
  root.insertBefore(mergeCells, sheetData?.nextSibling || null)
  return mergeCells
}

export function colName(columnNumber) {
  let columnName = ''
  let remainingNumber = columnNumber

  while (remainingNumber > 0) {
    remainingNumber -= 1
    columnName = String.fromCharCode(65 + (remainingNumber % 26)) + columnName
    remainingNumber = Math.floor(remainingNumber / 26)
  }
  return columnName || 'A'
}

export function maxColNum(document) {
  let maximumColumn = 0
  for (const cell of elems(document, 'c')) {
    const columnLetters = (cell.getAttribute('r') || '').replace(/\d/g, '')
    let columnNumber = 0
    for (const letter of columnLetters) {
      columnNumber = columnNumber * 26 + (letter.charCodeAt(0) - 64)
    }
    maximumColumn = Math.max(maximumColumn, columnNumber)
  }
  return maximumColumn
}
