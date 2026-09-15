import { elems } from './xml.js'
import { clearRow, rowAt, rowNum, setRowNumber } from './worksheetCells.js'
import { shiftAfter } from './worksheetRanges.js'

export function replaceBlock(document, startRow, baseRowCount, records, fillRow) {
  if (baseRowCount < 1) return 0

  const originalRows = []
  for (let rowOffset = 0; rowOffset < baseRowCount; rowOffset += 1) {
    const row = rowAt(document, startRow + rowOffset)
    if (row) originalRows.push(row)
  }
  if (!originalRows.length) return 0

  const rowTemplates = originalRows.map(row => row.cloneNode(true))
  const endRow = startRow + baseRowCount - 1
  const rowDelta = records.length - baseRowCount
  shiftAfter(document, endRow, rowDelta)

  for (const row of originalRows) row.parentNode.removeChild(row)

  const sheetData = elems(document, 'sheetData')[0]
  const insertionPoint =
    elems(sheetData, 'row')
      .filter(row => rowNum(row) >= startRow + records.length)
      .sort((leftRow, rightRow) => rowNum(leftRow) - rowNum(rightRow))[0] || null

  records.forEach((record, recordIndex) => {
    const templateIndex = Math.min(recordIndex, rowTemplates.length - 1)
    const rowCopy = rowTemplates[templateIndex].cloneNode(true)
    setRowNumber(rowCopy, startRow + recordIndex)
    clearRow(rowCopy)
    fillRow(rowCopy, record, recordIndex)
    sheetData.insertBefore(rowCopy, insertionPoint)
  })

  return rowDelta
}
