import { clearRow, setCol } from './worksheetCells.js'

export function excelDateFromRu(dateText) {
  const dateMatch = String(dateText || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!dateMatch) return dateText || ''

  const dateUtc = Date.UTC(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
  )
  const excelEpochUtc = Date.UTC(1899, 11, 30)
  return Math.round((dateUtc - excelEpochUtc) / 86400000)
}

export function fillTripRow(row, tripRow, usesMotohourLayout) {
  if (!tripRow) return

  setCol(row, 'A', tripRow[0])
  setCol(row, 'B', excelDateFromRu(tripRow[1]))
  setCol(row, 'C', tripRow[2])

  if (usesMotohourLayout) {
    setCol(row, 'D', tripRow[3])
    setCol(row, 'E', tripRow[11] ?? '')
    setCol(row, 'F', tripRow[4])
    setCol(row, 'G', tripRow[12] ?? '')
    setCol(row, 'H', tripRow[5])
    setCol(row, 'I', tripRow[6])
    setCol(row, 'J', tripRow[7])
    setCol(row, 'K', tripRow[8])
    setCol(row, 'L', tripRow[9])
    setCol(row, 'M', tripRow[10])

    const odometerStart = Number(tripRow[3])
    const odometerEnd = Number(tripRow[4])
    setCol(
      row,
      'N',
      Number.isFinite(odometerStart) && Number.isFinite(odometerEnd)
        ? odometerEnd - odometerStart
        : '',
    )
    setCol(row, 'O', '')
    return
  }

  setCol(row, 'D', tripRow[3])
  setCol(row, 'E', tripRow[4])
  setCol(row, 'F', tripRow[5])
  setCol(row, 'G', tripRow[6])
  setCol(row, 'H', tripRow[7])
  setCol(row, 'I', tripRow[8])
  setCol(row, 'J', tripRow[9])
  setCol(row, 'K', tripRow[10])
}

export function fillTotalRow(row, totalRow, usesMotohourLayout) {
  clearRow(row)
  setCol(row, 'B', 'ИТОГО')

  if (usesMotohourLayout) {
    setCol(row, 'D', totalRow?.[3] ?? '')
    setCol(row, 'E', totalRow?.[11] ?? '')
    setCol(row, 'F', totalRow?.[4] ?? '')
    setCol(row, 'G', totalRow?.[12] ?? '')
    setCol(row, 'L', totalRow?.[9] ?? '')

    const odometerStart = Number(totalRow?.[3])
    const odometerEnd = Number(totalRow?.[4])
    setCol(
      row,
      'N',
      Number.isFinite(odometerStart) && Number.isFinite(odometerEnd)
        ? odometerEnd - odometerStart
        : '',
    )
    return
  }

  setCol(row, 'D', totalRow?.[3] ?? '')
  setCol(row, 'E', totalRow?.[4] ?? '')
  setCol(row, 'J', totalRow?.[9] ?? '')
}

export function fillMaterialRow(row, materialRow, usesMotohourLayout) {
  if (usesMotohourLayout) {
    setCol(row, 'E', materialRow[3])
    setCol(row, 'H', materialRow[5])
    setCol(row, 'I', materialRow[6])
    setCol(row, 'J', materialRow[7])
    setCol(row, 'K', materialRow[8])
    return
  }

  setCol(row, 'D', materialRow[3])
  setCol(row, 'F', materialRow[5])
  setCol(row, 'G', materialRow[6])
  setCol(row, 'H', materialRow[7])
  setCol(row, 'I', materialRow[8])
}
