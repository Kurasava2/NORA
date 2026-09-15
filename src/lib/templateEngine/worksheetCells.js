import { XML_NAMESPACE, cellText, elems } from './xml.js'

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

export function setCell(cell, value) {
  clearChildren(cell)
  if (value === null || value === undefined || value === '') {
    cell.removeAttribute('t')
    return
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    cell.removeAttribute('t')
    const valueNode = cell.ownerDocument.createElementNS(XML_NAMESPACE, 'v')
    valueNode.textContent = String(value)
    cell.appendChild(valueNode)
    return
  }

  cell.setAttribute('t', 'inlineStr')
  const inlineString = cell.ownerDocument.createElementNS(XML_NAMESPACE, 'is')
  const textNode = cell.ownerDocument.createElementNS(XML_NAMESPACE, 't')
  textNode.setAttribute('xml:space', 'preserve')
  textNode.textContent = String(value)
  inlineString.appendChild(textNode)
  cell.appendChild(inlineString)
}

export function replaceTokens(text, values) {
  const exactToken = String(text).match(/^\s*\{\{([A-Z0-9_]+)\}\}\s*$/)
  if (exactToken && Object.prototype.hasOwnProperty.call(values, exactToken[1])) {
    return values[exactToken[1]]
  }

  let replacedText = String(text)
  for (const [tokenName, tokenValue] of Object.entries(values)) {
    replacedText = replacedText
      .split(`{{${tokenName}}}`)
      .join(tokenValue ?? '')
  }
  return replacedText
}

export function replaceRow(row, sharedStringValues, values) {
  for (const cell of elems(row, 'c')) {
    const previousText = cellText(cell, sharedStringValues)
    if (previousText.includes('{{')) {
      setCell(cell, replaceTokens(previousText, values))
    }
  }
}

export function rowNum(row) {
  return Number(row.getAttribute('r') || 0)
}

export function setRowNumber(row, rowNumber) {
  row.setAttribute('r', String(rowNumber))
  for (const cell of elems(row, 'c')) {
    const reference = cell.getAttribute('r')
    if (reference) {
      cell.setAttribute('r', reference.replace(/\d+$/, String(rowNumber)))
    }
  }
}

export function rowAt(document, rowNumber) {
  return elems(document, 'row').find(row => rowNum(row) === rowNumber) || null
}

export function clearRow(row) {
  for (const cell of elems(row, 'c')) setCell(cell, '')
}

export function colOf(cell) {
  return String(cell.getAttribute('r') || '').replace(/\d+$/, '')
}

export function cellInRow(row, columnName) {
  return elems(row, 'c').find(cell => colOf(cell) === columnName) || null
}

export function setCol(row, columnName, value) {
  const cell = cellInRow(row, columnName)
  if (cell) setCell(cell, value)
}

export function setRef(document, reference, value) {
  const cell = elems(document, 'c').find(
    candidateCell => candidateCell.getAttribute('r') === reference,
  )
  if (cell) setCell(cell, value)
}
