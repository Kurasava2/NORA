export const XML_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
export const RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
export const PACKAGE_RELATIONSHIP_NAMESPACE =
  'http://schemas.openxmlformats.org/package/2006/relationships'

const textDecoder = new TextDecoder('utf-8')
const textEncoder = new TextEncoder()

export function elems(node, tagName) {
  return [...node.getElementsByTagNameNS('*', tagName)]
}

export function xml(bytes) {
  const document = new DOMParser().parseFromString(
    textDecoder.decode(bytes),
    'application/xml',
  )
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('Повреждён XLSX: некорректный XML.')
  }
  return document
}

export function serialize(document) {
  return textEncoder.encode(new XMLSerializer().serializeToString(document))
}

export function normalizeTarget(target) {
  const normalizedTarget = String(target || '').replace(/\\/g, '/')
  if (normalizedTarget.startsWith('/')) return normalizedTarget.slice(1)
  if (normalizedTarget.startsWith('xl/')) return normalizedTarget
  return `xl/${normalizedTarget.replace(/^\.\//, '')}`
}

export function sharedStrings(files) {
  const sharedStringBytes = files.get('xl/sharedStrings.xml')
  if (!sharedStringBytes) return []

  const document = xml(sharedStringBytes)
  return elems(document, 'si').map(sharedString =>
    elems(sharedString, 't')
      .map(textNode => textNode.textContent || '')
      .join(''),
  )
}

export function cellText(cell, sharedStringValues) {
  const cellType = cell.getAttribute('t') || ''
  if (cellType === 's') {
    const valueNode = elems(cell, 'v')[0]
    return valueNode ? (sharedStringValues[Number(valueNode.textContent)] ?? '') : ''
  }
  if (cellType === 'inlineStr') {
    return elems(cell, 't')
      .map(textNode => textNode.textContent || '')
      .join('')
  }
  const valueNode = elems(cell, 'v')[0]
  return valueNode ? valueNode.textContent || '' : ''
}
