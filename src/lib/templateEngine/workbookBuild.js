import { zip } from '../xlsxCore.js'
import { unzip } from './archive.js'
import { analyze, chooseSource, workbookEntries } from './workbookAnalysis.js'
import { updateWorkbook, sheetRelPath } from './workbookMetadata.js'
import { nativeRender, tokenRender } from './sheetRender.js'
import { serialize, sharedStrings, xml } from './xml.js'

function renderWorksheet(files, source, sharedStringValues, model) {
  if (source.hasTrip) {
    return tokenRender(xml(files.get(source.path)), sharedStringValues, model)
  }
  if (source.native) {
    return nativeRender(source, sharedStringValues, model)
  }
  throw new Error(
    'Шаблон не распознан. Используйте исходную книгу с листом 3263 или размеченный шаблон.',
  )
}

function renderModelSheets(files, analyses, sharedStringValues, models) {
  const renderedSheets = []

  for (const model of models) {
    const source = chooseSource(analyses, model)
    if (!source) {
      throw new Error('В шаблоне не найден подходящий лист.')
    }

    const document = renderWorksheet(files, source, sharedStringValues, model)
    const relationshipPath = sheetRelPath(source.path)
    const relationshipBytes =
      relationshipPath && files.get(relationshipPath)
        ? files.get(relationshipPath)
        : null

    renderedSheets.push({
      model,
      source,
      xml: serialize(document),
      rel: relationshipBytes,
    })
  }

  return renderedSheets
}

function removeOriginalWorksheetFiles(files) {
  for (const fileName of [...files.keys()]) {
    const isWorksheet = /^xl\/worksheets\/sheet\d+\.xml$/.test(fileName)
    const isWorksheetRelationships =
      /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(fileName)
    if (isWorksheet || isWorksheetRelationships) files.delete(fileName)
  }
}

function insertRenderedWorksheetFiles(files, renderedSheets) {
  renderedSheets.forEach((renderedSheet, sheetIndex) => {
    const sheetNumber = sheetIndex + 1
    files.set(
      `xl/worksheets/sheet${sheetNumber}.xml`,
      renderedSheet.xml,
    )
    if (renderedSheet.rel) {
      files.set(
        `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`,
        renderedSheet.rel,
      )
    }
  })
}

export function buildBook(files, models) {
  const sharedStringValues = sharedStrings(files)
  const analyses = workbookEntries(files).map(entry =>
    analyze(files, entry, sharedStringValues),
  )
  const renderedSheets = renderModelSheets(
    files,
    analyses,
    sharedStringValues,
    models,
  )

  removeOriginalWorksheetFiles(files)
  insertRenderedWorksheetFiles(files, renderedSheets)
  updateWorkbook(files, renderedSheets)

  return zip(
    [...files.entries()].map(([name, data]) => ({
      name,
      data,
    })),
  )
}

export async function renderBook(templateBytes, models) {
  if (!models?.length) throw new Error('Нет ведомостей для экспорта')
  const files = await unzip(templateBytes)
  return buildBook(files, models)
}

export async function render(templateBytes, model) {
  return renderBook(templateBytes, [model])
}

export { safeSheetName, sheetRelPath, updateWorkbook } from './workbookMetadata.js'
