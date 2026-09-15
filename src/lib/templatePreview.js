import { sheetHtml } from './templatePreview/sheetHtml.js'
import { unzipXlsx } from './templatePreview/zipReader.js'

const PRINT_DOCUMENT_STYLES = [
  '@page{size:A4 portrait;margin:8mm}',
  '*{box-sizing:border-box}',
  'html,body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif}',
  '.xlsx-sheet-wrap{width:100%}',
  '.xlsx-sheet{width:100%;border-collapse:collapse;table-layout:fixed}',
  '.xlsx-sheet td{padding:2px 3px;overflow-wrap:anywhere;line-height:1.12;white-space:pre-wrap}',
].join('')

export async function renderHtml(renderXlsx, templateBytes, model, fullDocument = false) {
  const renderedWorkbook = await renderXlsx(templateBytes, model)
  const previewBody = sheetHtml(await unzipXlsx(renderedWorkbook))

  if (!fullDocument) return previewBody

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${PRINT_DOCUMENT_STYLES}</style></head><body>${previewBody}</body></html>`
}
