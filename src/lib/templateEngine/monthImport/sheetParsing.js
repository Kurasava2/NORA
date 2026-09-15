import { cellText, elems } from '../xml.js'
import { cellInRow, rowAt } from '../worksheetCells.js'
import { workbookDate } from './dateParsing.js'
import { numCell, parseMaterialCell } from './materialParsing.js'

export function cellRef(document, reference, sharedStringValues) {
  const cell = elems(document, 'c').find(
    candidateCell => candidateCell.getAttribute('r') === reference,
  )
  return cell ? cellText(cell, sharedStringValues) : ''
}

export function colText(row, columnName, sharedStringValues) {
  const cell = cellInRow(row, columnName)
  return cell ? cellText(cell, sharedStringValues) : ''
}

export function vehicleForSheet(analysis, vehicles, sharedStringValues) {
  const vehicleBySheetName = (vehicles || []).find(
    vehicle => String(vehicle.shortNo) === String(analysis.name).trim(),
  )
  if (vehicleBySheetName) return vehicleBySheetName

  const title = cellRef(analysis.doc, 'A1', sharedStringValues)
  const vehicleNumberMatch = String(title).match(/№\s*([0-9]{4})/)
  if (!vehicleNumberMatch) return null

  return (
    (vehicles || []).find(
      vehicle => String(vehicle.shortNo) === vehicleNumberMatch[1],
    ) || null
  )
}

function materialColumns(usesMotohourLayout) {
  return usesMotohourLayout
    ? { start: 'H', received: 'I', spent: 'J', end: 'K' }
    : { start: 'F', received: 'G', spent: 'H', end: 'I' }
}

function parseGsmBalances(
  row,
  columns,
  sharedStringValues,
  catalog,
  unknownMaterials,
) {
  const quantitiesByField = {}
  for (const [fieldName, columnName] of Object.entries(columns)) {
    quantitiesByField[fieldName] = parseMaterialCell(
      colText(row, columnName, sharedStringValues),
      catalog,
      unknownMaterials,
    )
  }

  const materialNames = new Set(
    Object.values(quantitiesByField).flatMap(quantities =>
      Object.keys(quantities),
    ),
  )
  const gsm = {}

  for (const materialName of materialNames) {
    const balance = {
      start: quantitiesByField.start[materialName] ?? 0,
      received: quantitiesByField.received[materialName] ?? 0,
      spent: quantitiesByField.spent[materialName] ?? 0,
      end: quantitiesByField.end[materialName] ?? 0,
    }
    const hasQuantity = Object.values(balance).some(
      quantity => Math.abs(Number(quantity) || 0) > 1e-9,
    )
    if (hasQuantity) gsm[materialName] = balance
  }

  return gsm
}

function readNote(row, sharedStringValues, usesMotohourLayout) {
  let note = String(
    colText(row, usesMotohourLayout ? 'M' : 'K', sharedStringValues) || '',
  ).trim()

  if (usesMotohourLayout && /^[-+]?\d+(?:[.,]\d+)?$/.test(note)) {
    note = ''
  }

  if (usesMotohourLayout && !note) {
    const alternativeNote = String(
      colText(row, 'O', sharedStringValues) || '',
    ).trim()
    if (
      alternativeNote &&
      !/^[-+]?\d+(?:[.,]\d+)?$/.test(alternativeNote)
    ) {
      note = alternativeNote
    }
  }

  return note
}

export function parseNativeSheet(
  analysis,
  sharedStringValues,
  vehicle,
  catalog,
  unknownMaterials,
) {
  if (!analysis.native || !analysis.headerRow || !analysis.totalRow) return []

  const usesMotohourLayout = analysis.maxCol > 11 && Boolean(vehicle.hasMotohours)
  const columns = materialColumns(usesMotohourLayout)
  const trips = []

  for (
    let rowNumber = analysis.headerRow + 1;
    rowNumber < analysis.totalRow;
    rowNumber += 1
  ) {
    const row = rowAt(analysis.doc, rowNumber)
    if (!row) continue

    const date = workbookDate(colText(row, 'B', sharedStringValues))
    const number = String(colText(row, 'C', sharedStringValues) || '').trim()
    const odometerStart = numCell(colText(row, 'D', sharedStringValues))
    const odometerEnd = numCell(
      colText(row, usesMotohourLayout ? 'F' : 'E', sharedStringValues),
    )
    const gsm = parseGsmBalances(
      row,
      columns,
      sharedStringValues,
      catalog,
      unknownMaterials,
    )
    const note = readNote(row, sharedStringValues, usesMotohourLayout)
    const motohoursStart = usesMotohourLayout
      ? (numCell(colText(row, 'E', sharedStringValues)) ?? '')
      : ''
    const motohoursEnd = usesMotohourLayout
      ? (numCell(colText(row, 'G', sharedStringValues)) ?? '')
      : ''
    const motohours = usesMotohourLayout
      ? (numCell(colText(row, 'L', sharedStringValues)) ?? '')
      : ''

    const hasData =
      date ||
      number ||
      odometerStart !== null ||
      odometerEnd !== null ||
      motohoursStart !== '' ||
      motohoursEnd !== '' ||
      Object.keys(gsm).length ||
      note
    if (!hasData) continue

    trips.push({
      date,
      number,
      odoStart: odometerStart ?? '',
      odoEnd: odometerEnd ?? '',
      motohoursStart,
      motohoursEnd,
      motohours,
      unused: /неисп/i.test(note),
      note,
      gsm,
    })
  }

  return trips
}
