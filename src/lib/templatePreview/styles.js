import { elementsByLocalName, parseXml } from './xml.js'

function xlsxColor(node) {
  if (!node) return ''
  const rgb = node.getAttribute('rgb')
  return rgb ? `#${rgb.replace(/^../, '')}` : ''
}

function borderCss(border, side) {
  const sideNode = [...border.children].find(child => child.localName === side)
  if (!sideNode?.getAttribute('style')) return ''

  const color =
    xlsxColor([...sideNode.children].find(child => child.localName === 'color')) || '#000'
  const borderStyle = sideNode.getAttribute('style')
  const width = ['medium', 'thick', 'double'].includes(borderStyle) ? '2px' : '1px'
  const lineStyle =
    borderStyle === 'double'
      ? 'double'
      : ['dashed', 'dashDot', 'dashDotDot'].includes(borderStyle)
        ? 'dashed'
        : ['dotted', 'hair'].includes(borderStyle)
          ? 'dotted'
          : 'solid'

  return `${width} ${lineStyle} ${color}`
}

export function createStyleReader(files) {
  const stylesBytes = files.get('xl/styles.xml')
  if (!stylesBytes) return () => ({ css: '', isDate: false })

  const document = parseXml(stylesBytes)
  const customNumberFormats = new Map(
    elementsByLocalName(document, 'numFmt').map(numberFormat => [
      Number(numberFormat.getAttribute('numFmtId')),
      numberFormat.getAttribute('formatCode') || '',
    ]),
  )

  const childrenOf = name => {
    const container = elementsByLocalName(document, name)[0]
    return container ? [...container.children] : []
  }

  const fonts = childrenOf('fonts').filter(child => child.localName === 'font')
  const fills = childrenOf('fills').filter(child => child.localName === 'fill')
  const borders = childrenOf('borders').filter(child => child.localName === 'border')
  const cellFormats = childrenOf('cellXfs').filter(child => child.localName === 'xf')

  return styleIndex => {
    const cellFormat = cellFormats[Number(styleIndex) || 0] || cellFormats[0]
    if (!cellFormat) return { css: '', isDate: false }

    const cssRules = []
    appendFontStyles(cssRules, fonts, cellFormat)
    appendFillStyle(cssRules, fills, cellFormat)
    appendBorderStyles(cssRules, borders, cellFormat)
    appendAlignmentStyles(cssRules, cellFormat)

    const numberFormatId = Number(cellFormat.getAttribute('numFmtId') || 0)
    const customFormat = customNumberFormats.get(numberFormatId) || ''
    const isDate =
      (numberFormatId >= 14 && numberFormatId <= 22) ||
      /[dy]/i.test(customFormat.replace(/\[[^\]]+\]/g, ''))

    return { css: cssRules.join(';'), isDate }
  }
}

function appendFontStyles(cssRules, fonts, cellFormat) {
  const font = fonts[Number(cellFormat.getAttribute('fontId')) || 0]
  if (!font) return

  const fontSize = elementsByLocalName(font, 'sz')[0]?.getAttribute('val')
  if (fontSize) cssRules.push(`font-size:${Math.max(7, Number(fontSize))}pt`)
  if (elementsByLocalName(font, 'b').length) cssRules.push('font-weight:700')
  if (elementsByLocalName(font, 'i').length) cssRules.push('font-style:italic')

  const color = xlsxColor(elementsByLocalName(font, 'color')[0])
  if (color) cssRules.push(`color:${color}`)
}

function appendFillStyle(cssRules, fills, cellFormat) {
  const fill = fills[Number(cellFormat.getAttribute('fillId')) || 0]
  const fillColor = fill ? xlsxColor(elementsByLocalName(fill, 'fgColor')[0]) : ''
  if (fillColor) cssRules.push(`background:${fillColor}`)
}

function appendBorderStyles(cssRules, borders, cellFormat) {
  const border = borders[Number(cellFormat.getAttribute('borderId')) || 0]
  if (!border) return

  for (const side of ['left', 'right', 'top', 'bottom']) {
    const borderValue = borderCss(border, side)
    if (borderValue) cssRules.push(`border-${side}:${borderValue}`)
  }
}

function appendAlignmentStyles(cssRules, cellFormat) {
  const alignment = elementsByLocalName(cellFormat, 'alignment')[0]
  if (!alignment) return

  const horizontal = alignment.getAttribute('horizontal')
  const vertical = alignment.getAttribute('vertical')
  if (horizontal) {
    cssRules.push(`text-align:${horizontal === 'centerContinuous' ? 'center' : horizontal}`)
  }
  if (vertical) cssRules.push(`vertical-align:${vertical === 'center' ? 'middle' : vertical}`)
  if (alignment.getAttribute('wrapText') === '1') cssRules.push('white-space:pre-wrap')
}
