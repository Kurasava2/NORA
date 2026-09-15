import { htmlEscape } from './xml.js'

export function buildTableBody({
  rows,
  cells,
  maxRow,
  maxColumn,
  mergeTopLeft,
  coveredCells,
  styleOf,
  sharedStringValues,
  displayCell,
}) {
  const rowsByNumber = new Map(rows.map(row => [Number(row.getAttribute('r') || 0), row]))
  let tableBody = ''

  for (let rowNumber = 1; rowNumber <= maxRow; rowNumber += 1) {
    const row = rowsByNumber.get(rowNumber)
    if (row?.getAttribute('hidden') === '1') continue

    const rowHeight = Number(row?.getAttribute('ht') || 0)
    tableBody += `<tr${rowHeight ? ` style="height:${(rowHeight * 1.333).toFixed(1)}px"` : ''}>`

    for (let columnNumber = 1; columnNumber <= maxColumn; columnNumber += 1) {
      const cellKey = `${rowNumber}:${columnNumber}`
      if (coveredCells.has(cellKey)) continue

      const cell = cells.get(cellKey)
      const mergedRange = mergeTopLeft.get(cellKey)
      const style = styleOf(cell?.getAttribute('s') || 0)
      const text = cell ? displayCell(cell, sharedStringValues, style) : ''
      const columnSpan =
        mergedRange && mergedRange.c2 > mergedRange.c1
          ? ` colspan="${mergedRange.c2 - mergedRange.c1 + 1}"`
          : ''
      const rowSpan =
        mergedRange && mergedRange.r2 > mergedRange.r1
          ? ` rowspan="${mergedRange.r2 - mergedRange.r1 + 1}"`
          : ''
      const styleAttribute = style.css ? ` style="${style.css}"` : ''

      tableBody += `<td${columnSpan}${rowSpan}${styleAttribute}>${htmlEscape(text).replace(
        /\r?\n/g,
        '<br>',
      )}</td>`
    }

    tableBody += '</tr>'
  }

  return tableBody
}
