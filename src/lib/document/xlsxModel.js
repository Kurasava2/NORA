import {
  fmtDate,
  longDate,
  materialSummaryName,
  motohoursWorked,
  nonZero,
  num,
  statementMaterialNames,
  totals,
} from '../domain.js'
import { materialLinesText, numericTotal } from './materialText.js'

function tripRow(state, trip, rowIndex, vehicle) {
  const odometerStart = num(trip.odoStart)
  const odometerEnd = num(trip.odoEnd)
  const motohoursStart = num(trip.motohoursStart)
  const motohoursEnd = num(trip.motohoursEnd)
  const workedMotohours = motohoursWorked(trip)

  return [
    rowIndex + 1,
    fmtDate(trip.date),
    trip.number,
    odometerStart,
    odometerEnd,
    materialLinesText(state, trip, 'start'),
    materialLinesText(state, trip, 'received'),
    materialLinesText(state, trip, 'spent'),
    materialLinesText(state, trip, 'end'),
    vehicle.hasMotohours
      ? (workedMotohours ?? '')
      : odometerStart !== null && odometerEnd !== null
        ? odometerEnd - odometerStart
        : null,
    trip.note || '',
    vehicle.hasMotohours ? (motohoursStart ?? '') : '',
    vehicle.hasMotohours ? (motohoursEnd ?? '') : '',
  ]
}

function totalRow(trips, vehicle, kilometerTotal, motohourValues, motohoursComplete) {
  const firstTrip = trips[0]
  const lastTrip = trips[trips.length - 1]
  const firstMotohours = trips.map(trip => num(trip.motohoursStart)).find(value => value !== null) ?? null
  const lastMotohours = [...trips]
    .reverse()
    .map(trip => num(trip.motohoursEnd))
    .find(value => value !== null) ?? null
  const workTotal = vehicle.hasMotohours
    ? motohoursComplete
      ? motohourValues.reduce((sum, value) => sum + value, 0)
      : ''
    : kilometerTotal

  return [
    '',
    'ИТОГО',
    '',
    num(firstTrip?.odoStart),
    num(lastTrip?.odoEnd),
    '',
    '',
    '',
    '',
    workTotal,
    '',
    vehicle.hasMotohours ? (firstMotohours ?? '') : '',
    vehicle.hasMotohours ? (lastMotohours ?? '') : '',
  ]
}

function materialRows(state, statement, statementTotals) {
  return statementMaterialNames(statement)
    .filter(materialName => {
      const materialTotal = statementTotals[materialName]
      return [materialTotal.start, materialTotal.received, materialTotal.spent, materialTotal.end].some(
        value => nonZero(state, value),
      )
    })
    .map(materialName => {
      const materialTotal = statementTotals[materialName]
      return [
        '',
        '',
        '',
        materialSummaryName(materialName),
        '',
        numericTotal(materialTotal.start),
        numericTotal(materialTotal.received),
        numericTotal(materialTotal.spent),
        numericTotal(materialTotal.end),
        '',
        '',
      ]
    })
}

export function xlsxModel(state, period, statement, vehicle) {
  const trips = statement.trips || []
  const statementTotals = totals(statement)
  const workTrips = trips.filter(trip => !trip.unused)
  const motohourValues = workTrips.map(trip => motohoursWorked(trip))
  const motohoursComplete =
    !vehicle.hasMotohours || motohourValues.every(value => value !== null)
  let kilometerTotal = 0

  const tripRows = trips.map((trip, rowIndex) => {
    const odometerStart = num(trip.odoStart)
    const odometerEnd = num(trip.odoEnd)
    if (odometerStart !== null && odometerEnd !== null) {
      kilometerTotal += odometerEnd - odometerStart
    }
    return tripRow(state, trip, rowIndex, vehicle)
  })

  const registrationNumber = state.settings.regMode === 'short' ? vehicle.shortNo : vehicle.reg

  return {
    name: vehicle.shortNo,
    vehicleModel: vehicle.model,
    vehicleNo: registrationNumber,
    shortNo: vehicle.shortNo,
    hasMotohours: Boolean(vehicle.hasMotohours),
    period: `${fmtDate(period.start)} — ${fmtDate(period.end)}`,
    dateFrom: longDate(period.start),
    dateTo: longDate(period.end),
    title: `Расчетная ведомость расхода горючего и масла по путевым листам автомобиля ${vehicle.model} №${registrationNumber}\nза ${longDate(period.start)} - ${longDate(period.end)}`,
    norm: vehicle.normText,
    tripRows,
    totalRow: totalRow(trips, vehicle, kilometerTotal, motohourValues, motohoursComplete),
    materialRows: materialRows(state, statement, statementTotals),
    signTitle: state.settings.unit,
    signLine: {
      rank: state.settings.rank,
      commander: state.settings.commander,
    },
  }
}
