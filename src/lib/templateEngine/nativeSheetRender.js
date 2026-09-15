import { serialize, xml } from './xml.js'
import { rowAt, setRef } from './worksheetCells.js'
import { normalizeSignatureRows, replaceBlock } from './worksheetLayout.js'
import {
  fillMaterialRow,
  fillTotalRow,
  fillTripRow,
} from './nativeRowFill.js'
import { replaceNativeSheetLabels } from './nativeSheetLabels.js'

export function nativeRender(source, sharedStringValues, model) {
  const document = xml(serialize(source.doc))
  const usesMotohourLayout = source.maxCol > 11 && model?.hasMotohours
  const tripRecords = (model.tripRows || []).length ? model.tripRows : [null]
  const tripStartRow = source.headerRow + 1

  const tripRowDelta = replaceBlock(
    document,
    tripStartRow,
    source.tripBaseCount,
    tripRecords,
    (row, tripRow) => fillTripRow(row, tripRow, usesMotohourLayout),
  )

  const totalRowNumber = source.totalRow + tripRowDelta
  const totalRow = rowAt(document, totalRowNumber)
  if (totalRow) fillTotalRow(totalRow, model.totalRow, usesMotohourLayout)

  if (source.materialBaseCount) {
    const materialStartRow = source.totalRow + tripRowDelta + 1
    replaceBlock(
      document,
      materialStartRow,
      source.materialBaseCount,
      model.materialRows || [],
      (row, materialRow) =>
        fillMaterialRow(row, materialRow, usesMotohourLayout),
    )
  }

  setRef(document, 'A1', model.title || '')
  setRef(document, 'A2', model.norm || '')
  replaceNativeSheetLabels(document, sharedStringValues, model)
  normalizeSignatureRows(document, sharedStringValues, model, source.maxCol)
  return document
}
