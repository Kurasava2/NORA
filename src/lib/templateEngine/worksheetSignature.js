import { XML_NAMESPACE, cellText, elems } from './xml.js'
import { rowNum, setCell } from './worksheetCells.js'
import {
  colName,
  ensureMergeCells,
  maxColNum,
  mergeRangeRows,
} from './worksheetRanges.js'

export function setMergedCenteredRow(
  document,
  row,
  value,
  styleCell,
  maxColumn,
) {
  const rowNumber = rowNum(row)
  const lastColumn = colName(maxColumn || maxColNum(document) || 11)
  const mergeCells = ensureMergeCells(document)

  for (const mergeCell of [...elems(mergeCells, 'mergeCell')]) {
    const rowRange = mergeRangeRows(mergeCell.getAttribute('ref'))
    if (rowRange && rowNumber >= rowRange.a && rowNumber <= rowRange.b) {
      mergeCell.parentNode.removeChild(mergeCell)
    }
  }

  const styleId =
    styleCell?.getAttribute('s') ||
    elems(row, 'c').find(cell => cell.getAttribute('s'))?.getAttribute('s') ||
    ''

  for (const cell of [...elems(row, 'c')]) cell.parentNode.removeChild(cell)

  const firstCell = document.createElementNS(XML_NAMESPACE, 'c')
  firstCell.setAttribute('r', `A${rowNumber}`)
  if (styleId) firstCell.setAttribute('s', styleId)
  setCell(firstCell, value)
  row.appendChild(firstCell)

  const mergeCell = document.createElementNS(XML_NAMESPACE, 'mergeCell')
  mergeCell.setAttribute('ref', `A${rowNumber}:${lastColumn}${rowNumber}`)
  mergeCells.appendChild(mergeCell)
  mergeCells.setAttribute('count', String(elems(mergeCells, 'mergeCell').length))
}

function findSignatureRows(document, sharedStringValues, model) {
  let titleRow = null
  let titleCell = null
  let signatureRow = null

  for (const row of elems(document, 'row')) {
    const cells = elems(row, 'c')
    const values = cells.map(cell => cellText(cell, sharedStringValues))
    const lowerText = values.join(' ').toLowerCase()

    if (
      !titleRow &&
      model.signTitle &&
      lowerText.includes('командир автомобильной роты')
    ) {
      titleRow = row
      titleCell =
        cells.find(cell =>
          cellText(cell, sharedStringValues)
            .toLowerCase()
            .includes('командир автомобильной роты'),
        ) ||
        cells[0] ||
        null
    }

    if (!signatureRow && model.signLine) {
      const rank = String(model.signLine.rank || '').trim().toLowerCase()
      const commander = String(model.signLine.commander || '')
        .trim()
        .toLowerCase()
      const matchesRank =
        rank && values.some(value => String(value).trim().toLowerCase() === rank)
      const matchesCommander =
        commander &&
        values.some(value => String(value).trim().toLowerCase() === commander)
      if (matchesRank || matchesCommander) signatureRow = row
    }
  }

  return { titleRow, titleCell, signatureRow }
}

export function normalizeSignatureRows(
  document,
  sharedStringValues,
  model,
  maxColumn,
) {
  if (!model?.signTitle && !model?.signLine) return

  const { titleRow, titleCell, signatureRow } = findSignatureRows(
    document,
    sharedStringValues,
    model,
  )

  if (titleRow) {
    setMergedCenteredRow(
      document,
      titleRow,
      model.signTitle,
      titleCell,
      maxColumn,
    )
  }

  if (signatureRow && model.signLine) {
    const styleCell = titleCell || elems(signatureRow, 'c')[0] || null
    setMergedCenteredRow(
      document,
      signatureRow,
      `${model.signLine.rank || ''}__________${model.signLine.commander || ''}`,
      styleCell,
      maxColumn,
    )
  }
}
