import {
  fmtDate,
  kmfmt,
  materialSummaryName,
  motohoursWorked,
  nfmt,
  nonZero,
  num,
  orderedMaterialNames,
  statementMaterialNames,
} from '../domain.js'
import { materialLinesText, numericTotal } from './materialText.js'

export function escapeHtml(value) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return String(value ?? '').replace(/[&<>"']/g, character => replacements[character])
}

function materialLinesHtml(state, trip, fieldName) {
  return materialLinesText(state, trip, fieldName)
    .split('\n')
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br>')
}

function tripWorkValue(trip, vehicle) {
  if (vehicle.hasMotohours) {
    const workedMotohours = motohoursWorked(trip)
    return workedMotohours === null ? '—' : nfmt(workedMotohours)
  }

  const odometerStart = num(trip.odoStart)
  const odometerEnd = num(trip.odoEnd)
  return odometerStart !== null && odometerEnd !== null
    ? kmfmt(odometerEnd - odometerStart)
    : '—'
}

function tripRowHtml(state, trip, vehicle, rowIndex) {
  return [
    '<tr class="doc-trip-row">',
    `<td>${rowIndex + 1}</td>`,
    `<td>${escapeHtml(trip.date ? trip.date.split('-').reverse().join('.') : '')}</td>`,
    `<td>${escapeHtml(trip.number)}</td>`,
    `<td>${kmfmt(trip.odoStart)}</td>`,
    `<td>${kmfmt(trip.odoEnd)}</td>`,
    `<td>${materialLinesHtml(state, trip, 'start')}</td>`,
    `<td>${materialLinesHtml(state, trip, 'received')}</td>`,
    `<td>${materialLinesHtml(state, trip, 'spent')}</td>`,
    `<td>${materialLinesHtml(state, trip, 'end')}</td>`,
    `<td>${tripWorkValue(trip, vehicle)}</td>`,
    `<td class="text">${escapeHtml(trip.note || '')}</td>`,
    '</tr>',
  ].join('')
}

export function tripRowsHtml(state, trips, vehicle) {
  return trips.map((trip, rowIndex) => tripRowHtml(state, trip, vehicle, rowIndex)).join('')
}

function materialRowHtml(materialName, materialTotal) {
  return [
    '<tr class="doc-material-row">',
    '<td></td><td></td><td></td>',
    `<td class="tot">${escapeHtml(materialSummaryName(materialName))}</td>`,
    '<td></td>',
    `<td>${nfmt(numericTotal(materialTotal.start))}</td>`,
    `<td>${nfmt(numericTotal(materialTotal.received))}</td>`,
    `<td>${nfmt(numericTotal(materialTotal.spent))}</td>`,
    `<td>${nfmt(numericTotal(materialTotal.end))}</td>`,
    '<td></td><td></td>',
    '</tr>',
  ].join('')
}

export function materialRowsHtml(state, statement, statementTotals) {
  return orderedMaterialNames(state, statementMaterialNames(statement))
    .filter(materialName => {
      const materialTotal = statementTotals[materialName]
      return [materialTotal.start, materialTotal.received, materialTotal.spent, materialTotal.end].some(
        value => nonZero(state, value),
      )
    })
    .map(materialName => materialRowHtml(materialName, statementTotals[materialName]))
    .join('')
}

export function statementTotalsHtml(trips, totalWork) {
  const firstTrip = trips[0]
  const lastTrip = trips[trips.length - 1]
  return [
    '<tr class="doc-total-row">',
    '<td></td><td class="tot">ИТОГО</td><td></td>',
    `<td>${kmfmt(firstTrip?.odoStart)}</td>`,
    `<td>${kmfmt(lastTrip?.odoEnd)}</td>`,
    '<td></td><td></td><td></td><td></td>',
    `<td class="tot">${totalWork}</td>`,
    '<td></td>',
    '</tr>',
  ].join('')
}

export function totalWorkText(trips, vehicle) {
  if (vehicle.hasMotohours) {
    const workTrips = trips.filter(trip => !trip.unused)
    const motohourValues = workTrips.map(trip => motohoursWorked(trip))
    return motohourValues.every(value => value !== null)
      ? nfmt(motohourValues.reduce((sum, value) => sum + value, 0))
      : '—'
  }

  const kilometerTotal = trips.reduce((sum, trip) => {
    const odometerStart = num(trip.odoStart)
    const odometerEnd = num(trip.odoEnd)
    return odometerStart !== null && odometerEnd !== null
      ? sum + odometerEnd - odometerStart
      : sum
  }, 0)
  return kmfmt(kilometerTotal)
}
