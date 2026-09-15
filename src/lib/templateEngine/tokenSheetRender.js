import { cellText, elems } from './xml.js'
import { replaceRow, rowNum, setRowNumber } from './worksheetCells.js'
import { maxColNum, normalizeSignatureRows, shiftAfter } from './worksheetLayout.js'

function findRepeatRow(document, sharedStringValues, tokenName) {
  return (
    elems(document, 'row').find(row =>
      elems(row, 'c').some(cell =>
        cellText(cell, sharedStringValues).includes(`{{${tokenName}}}`),
      ),
    ) || null
  )
}

function expandTokenRows(document, sharedStringValues, tokenName, records) {
  const repeatRow = findRepeatRow(document, sharedStringValues, tokenName)
  if (!repeatRow) return

  const startRow = rowNum(repeatRow)
  const rowTemplate = repeatRow.cloneNode(true)
  const parentNode = repeatRow.parentNode
  const nextSibling = repeatRow.nextSibling
  const rowDelta = records.length - 1

  shiftAfter(document, startRow, rowDelta)
  parentNode.removeChild(repeatRow)

  records.forEach((record, recordIndex) => {
    const rowCopy = rowTemplate.cloneNode(true)
    setRowNumber(rowCopy, startRow + recordIndex)
    replaceRow(rowCopy, sharedStringValues, record)
    parentNode.insertBefore(rowCopy, nextSibling)
  })
}

function tripTokenRecords(model) {
  return (model.tripRows || []).map(row => ({
    TRIP_NO: row[0],
    TRIP_DATE: row[1],
    TRIP_WAYBILL: row[2],
    ODO_START: row[3],
    ODO_END: row[4],
    GSM_START: row[5],
    GSM_RECEIVED: row[6],
    GSM_SPENT: row[7],
    GSM_END: row[8],
    KM: row[9],
    NOTE: row[10],
  }))
}

function materialTokenRecords(model) {
  return (model.materialRows || []).map(row => ({
    MAT_NAME: row[3],
    MAT_START: row[5],
    MAT_RECEIVED: row[6],
    MAT_SPENT: row[7],
    MAT_END: row[8],
  }))
}

function scalarTokenValues(model) {
  return {
    TITLE: model.title || '',
    NORM: model.norm || '',
    VEHICLE: model.vehicleModel
      ? `${model.vehicleModel} №${model.vehicleNo || ''}`
      : '',
    VEHICLE_MODEL: model.vehicleModel || '',
    VEHICLE_NO: model.vehicleNo || '',
    SHORT_NO: model.shortNo || '',
    PERIOD: model.period || '',
    DATE_FROM: model.dateFrom || '',
    DATE_TO: model.dateTo || '',
    UNIT: model.signTitle || '',
    RANK: model.signLine?.rank || '',
    COMMANDER: model.signLine?.commander || '',
    FIRST_ODO: model.totalRow?.[3] ?? '',
    LAST_ODO: model.totalRow?.[4] ?? '',
    TOTAL_KM: model.totalRow?.[9] ?? '',
  }
}

export function tokenRender(document, sharedStringValues, model) {
  expandTokenRows(
    document,
    sharedStringValues,
    'TRIP_NO',
    tripTokenRecords(model),
  )
  expandTokenRows(
    document,
    sharedStringValues,
    'MAT_NAME',
    materialTokenRecords(model),
  )

  const scalarValues = scalarTokenValues(model)
  for (const row of elems(document, 'row')) {
    replaceRow(row, sharedStringValues, scalarValues)
  }

  normalizeSignatureRows(
    document,
    sharedStringValues,
    model,
    maxColNum(document),
  )
  return document
}
