const dec = new TextDecoder('utf-8')
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const MAX_INPUT = 64 * 1024 * 1024
const MAX_ENTRY = 64 * 1024 * 1024
const MAX_TOTAL = 192 * 1024 * 1024

const elems = (node, name) => [...node.getElementsByTagNameNS('*', name)]
const rd16 = (d, o) => d.getUint16(o, true)
const rd32 = (d, o) => d.getUint32(o, true)

async function inflateRaw(bytes, maxBytes = MAX_ENTRY) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Среда не поддерживает распаковку XLSX.')
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw new Error('Слишком большой элемент XLSX для 32-битной сборки.')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock?.()
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
  return out
}

async function unzip(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.byteLength < 22 || bytes.byteLength > MAX_INPUT) throw new Error('Некорректный или слишком большой XLSX.')
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (rd32(d, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Файл не похож на корректный XLSX.')
  const count = rd16(d, eocd + 10)
  let p = rd32(d, eocd + 16)
  let totalUncompressed = 0
  const out = new Map()
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || rd32(d, p) !== 0x02014b50) throw new Error('Повреждён XLSX.')
    const flags = rd16(d, p + 8), method = rd16(d, p + 10)
    const csize = rd32(d, p + 20), usize = rd32(d, p + 24)
    const nlen = rd16(d, p + 28), xlen = rd16(d, p + 30), clen = rd16(d, p + 32)
    const loff = rd32(d, p + 42), next = p + 46 + nlen + xlen + clen
    if (flags & 1) throw new Error('XLSX защищён паролем.')
    if (usize > MAX_ENTRY) throw new Error('Слишком большой элемент XLSX.')
    totalUncompressed += usize
    if (totalUncompressed > MAX_TOTAL) throw new Error('XLSX слишком велик после распаковки.')
    const name = dec.decode(bytes.slice(p + 46, p + 46 + nlen))
    if (loff + 30 > bytes.length || rd32(d, loff) !== 0x04034b50) throw new Error('Повреждён XLSX.')
    const ln = rd16(d, loff + 26), lx = rd16(d, loff + 28)
    const start = loff + 30 + ln + lx, end = start + csize
    const compressed = bytes.slice(start, end)
    const data = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null
    if (!data) throw new Error('Неподдерживаемое сжатие XLSX.')
    out.set(name, data)
    p = next
  }
  return out
}

function xml(bytes) {
  const doc = new DOMParser().parseFromString(dec.decode(bytes), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Повреждён XML внутри XLSX.')
  return doc
}

function normalizeTarget(target) {
  let t = String(target || '').replace(/\\/g, '/')
  if (t.startsWith('/')) return t.slice(1)
  if (t.startsWith('xl/')) return t
  return 'xl/' + t.replace(/^\.\//, '')
}

function sharedStrings(files) {
  const b = files.get('xl/sharedStrings.xml')
  if (!b) return []
  return elems(xml(b), 'si').map(si => elems(si, 't').map(t => t.textContent || '').join(''))
}

function cellText(cell, shared) {
  const type = cell.getAttribute('t') || ''
  if (type === 's') {
    const v = elems(cell, 'v')[0]
    return v ? shared[Number(v.textContent)] ?? '' : ''
  }
  if (type === 'inlineStr') return elems(cell, 't').map(x => x.textContent || '').join('')
  const v = elems(cell, 'v')[0]
  return v ? v.textContent || '' : ''
}

function workbookEntries(files) {
  const wb = files.get('xl/workbook.xml'), rel = files.get('xl/_rels/workbook.xml.rels')
  if (!wb || !rel) return []
  const wd = xml(wb), rd = xml(rel)
  const rmap = new Map(elems(rd, 'Relationship').map(r => [r.getAttribute('Id'), normalizeTarget(r.getAttribute('Target'))]))
  return elems(wd, 'sheet').map((sheet, index) => {
    const rid = sheet.getAttributeNS(RNS, 'id') || sheet.getAttribute('r:id')
    return { name: sheet.getAttribute('name') || `Sheet${index + 1}`, path: rmap.get(rid) || null }
  }).filter(x => x.path && files.has(x.path))
}

function a1Parts(ref) {
  const m = String(ref || '').match(/^([A-Z]+)(\d+)$/i)
  if (!m) return null
  let col = 0
  for (const ch of m[1].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64
  return { col, row: Number(m[2]) }
}

function rangeParts(ref) {
  const [a, b = a] = String(ref || '').split(':')
  const x = a1Parts(a), y = a1Parts(b)
  return x && y ? { c1: Math.min(x.col, y.col), c2: Math.max(x.col, y.col), r1: Math.min(x.row, y.row), r2: Math.max(x.row, y.row) } : null
}

function xlsxColor(node) {
  if (!node) return ''
  const rgb = node.getAttribute('rgb')
  if (rgb) return '#' + rgb.replace(/^../, '')
  return ''
}

function excelSerialIso(value) {
  const n = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 1) return ''
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000).toISOString().slice(0, 10)
}

function styleReader(files) {
  const b = files.get('xl/styles.xml')
  if (!b) return () => ({ css: '', isDate: false })
  const d = xml(b)
  const custom = new Map(elems(d, 'numFmt').map(n => [Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') || '']))
  const childrenOf = name => elems(d, name)[0] ? [...elems(d, name)[0].children] : []
  const fonts = childrenOf('fonts').filter(x => x.localName === 'font')
  const fills = childrenOf('fills').filter(x => x.localName === 'fill')
  const borders = childrenOf('borders').filter(x => x.localName === 'border')
  const xfs = childrenOf('cellXfs').filter(x => x.localName === 'xf')
  const borderCss = (border, side) => {
    const node = [...border.children].find(x => x.localName === side)
    if (!node?.getAttribute('style')) return ''
    const color = xlsxColor([...node.children].find(x => x.localName === 'color')) || '#000'
    const st = node.getAttribute('style')
    const width = ['medium', 'thick', 'double'].includes(st) ? '2px' : '1px'
    const kind = st === 'double' ? 'double' : ['dashed', 'dashDot', 'dashDotDot'].includes(st) ? 'dashed' : ['dotted', 'hair'].includes(st) ? 'dotted' : 'solid'
    return `${width} ${kind} ${color}`
  }
  return index => {
    const xf = xfs[Number(index) || 0] || xfs[0]
    if (!xf) return { css: '', isDate: false }
    const css = []
    const font = fonts[Number(xf.getAttribute('fontId')) || 0]
    if (font) {
      const sz = elems(font, 'sz')[0]?.getAttribute('val')
      if (sz) css.push(`font-size:${Math.max(7, Number(sz))}pt`)
      if (elems(font, 'b').length) css.push('font-weight:700')
      if (elems(font, 'i').length) css.push('font-style:italic')
      const color = xlsxColor(elems(font, 'color')[0]); if (color) css.push(`color:${color}`)
    }
    const fill = fills[Number(xf.getAttribute('fillId')) || 0]
    const fillColor = fill ? xlsxColor(elems(fill, 'fgColor')[0]) : ''
    if (fillColor) css.push(`background:${fillColor}`)
    const border = borders[Number(xf.getAttribute('borderId')) || 0]
    if (border) for (const side of ['left', 'right', 'top', 'bottom']) { const value = borderCss(border, side); if (value) css.push(`border-${side}:${value}`) }
    const align = elems(xf, 'alignment')[0]
    if (align) {
      const h = align.getAttribute('horizontal'), v = align.getAttribute('vertical')
      if (h) css.push(`text-align:${h === 'centerContinuous' ? 'center' : h}`)
      if (v) css.push(`vertical-align:${v === 'center' ? 'middle' : v}`)
      if (align.getAttribute('wrapText') === '1') css.push('white-space:pre-wrap')
    }
    const numFmtId = Number(xf.getAttribute('numFmtId') || 0), fmt = custom.get(numFmtId) || ''
    const isDate = (numFmtId >= 14 && numFmtId <= 22) || /[dy]/i.test(fmt.replace(/\[[^\]]+\]/g, ''))
    return { css: css.join(';'), isDate }
  }
}

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function displayCell(cell, shared, style) {
  const raw = cellText(cell, shared)
  if (style.isDate && /^\d+(?:\.\d+)?$/.test(raw)) {
    const iso = excelSerialIso(raw)
    if (iso) { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}` }
  }
  return raw
}

function sheetHtml(files) {
  const shared = sharedStrings(files), entry = workbookEntries(files)[0]
  if (!entry) throw new Error('В сформированном XLSX нет листа для предпросмотра.')
  const doc = xml(files.get(entry.path)), styleOf = styleReader(files), rows = elems(doc, 'row')
  const dim = rangeParts(elems(doc, 'dimension')[0]?.getAttribute('ref') || '')
  let maxRow = dim?.r2 || 0, maxCol = dim?.c2 || 0
  const cells = new Map()
  for (const cell of elems(doc, 'c')) {
    const p = a1Parts(cell.getAttribute('r'))
    if (!p) continue
    cells.set(`${p.row}:${p.col}`, cell); maxRow = Math.max(maxRow, p.row); maxCol = Math.max(maxCol, p.col)
  }
  maxRow = Math.max(maxRow, ...rows.map(r => Number(r.getAttribute('r') || 0)), 1); maxCol = Math.max(maxCol, 1)
  const mergeTop = new Map(), covered = new Set()
  for (const merge of elems(doc, 'mergeCell').map(x => rangeParts(x.getAttribute('ref'))).filter(Boolean)) {
    mergeTop.set(`${merge.r1}:${merge.c1}`, merge)
    for (let r = merge.r1; r <= merge.r2; r++) for (let c = merge.c1; c <= merge.c2; c++) if (r !== merge.r1 || c !== merge.c1) covered.add(`${r}:${c}`)
  }
  const widths = Array(maxCol).fill(10)
  for (const col of elems(doc, 'col')) {
    const a = Number(col.getAttribute('min') || 1), b = Number(col.getAttribute('max') || a), w = Number(col.getAttribute('width') || 10)
    for (let i = Math.max(1, a); i <= Math.min(maxCol, b); i++) widths[i - 1] = col.getAttribute('hidden') === '1' ? 0.01 : w
  }
  const total = widths.reduce((a, b) => a + b, 0) || 1
  const colgroup = '<colgroup>' + widths.map(w => `<col style="width:${(w / total * 100).toFixed(4)}%">`).join('') + '</colgroup>'
  const rowsByNumber = new Map(rows.map(r => [Number(r.getAttribute('r') || 0), r]))
  let body = ''
  for (let r = 1; r <= maxRow; r++) {
    const row = rowsByNumber.get(r)
    if (row?.getAttribute('hidden') === '1') continue
    const ht = Number(row?.getAttribute('ht') || 0)
    body += `<tr${ht ? ` style="height:${(ht * 1.333).toFixed(1)}px"` : ''}>`
    for (let c = 1; c <= maxCol; c++) {
      const key = `${r}:${c}`
      if (covered.has(key)) continue
      const cell = cells.get(key), merge = mergeTop.get(key), style = styleOf(cell?.getAttribute('s') || 0)
      const text = cell ? displayCell(cell, shared, style) : ''
      const span = `${merge && merge.c2 > merge.c1 ? ` colspan="${merge.c2 - merge.c1 + 1}"` : ''}${merge && merge.r2 > merge.r1 ? ` rowspan="${merge.r2 - merge.r1 + 1}"` : ''}`
      body += `<td${span}${style.css ? ` style="${style.css}"` : ''}>${htmlEscape(text).replace(/\r?\n/g, '<br>')}</td>`
    }
    body += '</tr>'
  }
  return `<div class="xlsx-sheet-wrap"><table class="xlsx-sheet">${colgroup}<tbody>${body}</tbody></table></div>`
}

export async function renderHtml(renderXlsx, templateBytes, model, fullDocument = false) {
  const rendered = await renderXlsx(templateBytes, model)
  const body = sheetHtml(await unzip(rendered))
  if (!fullDocument) return body
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif}.xlsx-sheet-wrap{width:100%}.xlsx-sheet{width:100%;border-collapse:collapse;table-layout:fixed}.xlsx-sheet td{padding:2px 3px;overflow-wrap:anywhere;line-height:1.12;white-space:pre-wrap}</style></head><body>${body}</body></html>`
}
