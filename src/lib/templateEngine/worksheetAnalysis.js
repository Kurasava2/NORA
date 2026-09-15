import { cellText, elems, xml } from './xml.js'
import { rowNum } from './worksheetCells.js'
import { maxColNum } from './worksheetLayout.js'

function worksheetTextRows(document, sharedStringValues) {
  return elems(document, 'row').map(row => ({
    r: rowNum(row),
    vals: elems(row, 'c').map(cell => cellText(cell, sharedStringValues)),
  }))
}

function findRowByCellText(textRows, predicate) {
  return textRows.find(row => row.vals.some(predicate))?.r || null
}

function findMaterialRows(textRows, totalRow, noteRow, maxColumn) {
  if (!totalRow) return []

  const materialRows = []
  const candidateRows = textRows
    .filter(row => row.r > totalRow && (!noteRow || row.r < noteRow))
    .sort((leftRow, rightRow) => leftRow.r - rightRow.r)

  for (const row of candidateRows) {
    const materialName = String(
      (maxColumn > 11 ? row.vals[4] : row.vals[3]) || '',
    ).trim()
    const hasContent = row.vals.some(
      value => String(value ?? '').trim() !== '',
    )

    if (!hasContent) {
      if (materialRows.length) break
      continue
    }

    if (materialName && materialName.toUpperCase() !== 'ИТОГО') {
      materialRows.push(row.r)
    } else if (materialRows.length) {
      break
    }
  }

  return materialRows
}

export function analyze(files, entry, sharedStringValues) {
  const document = xml(files.get(entry.path))
  const textRows = worksheetTextRows(document, sharedStringValues)
  const allText = textRows.flatMap(row => row.vals).join('\n')

  const hasTrip = allText.includes('{{TRIP_NO}}')
  const hasMaterials = allText.includes('{{MAT_NAME}}')
  const hasTitle = allText.includes('{{TITLE}}')
  const headerRow = findRowByCellText(
    textRows,
    value => String(value).trim().toLowerCase() === '№ п/п',
  )
  const totalRow = findRowByCellText(
    textRows,
    value => String(value).trim().toUpperCase() === 'ИТОГО',
  )
  const noteRow = findRowByCellText(textRows, value =>
    String(value).trim().toLowerCase().startsWith('примечание:'),
  )
  const maxColumn = maxColNum(document)
  const materialRows = findMaterialRows(
    textRows,
    totalRow,
    noteRow,
    maxColumn,
  )
  const native = Boolean(headerRow && totalRow)

  return {
    ...entry,
    doc: document,
    hasTrip,
    hasMaterials,
    hasTitle,
    headerRow,
    totalRow,
    noteRow,
    maxCol: maxColumn,
    materialRows,
    tripBaseCount:
      headerRow && totalRow ? Math.max(1, totalRow - headerRow - 1) : 0,
    materialBaseCount: materialRows.length,
    native,
    score:
      (hasTrip ? 100 : 0) +
      (entry.name === '3263' ? 50 : 0) +
      (native ? 20 : 0) +
      (allText.includes('Расчетная ведомость') ? 10 : 0) +
      (maxColumn === 11 ? 5 : 0),
  }
}
