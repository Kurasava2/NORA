import { longDate, totals } from '../domain.js'
import {
  escapeHtml,
  materialRowsHtml,
  statementTotalsHtml,
  totalWorkText,
  tripRowsHtml,
} from './documentRows.js'
import { printStyles } from './printStyles.js'

function documentHeaderHtml(period, vehicle, registrationNumber) {
  const title =
    `Расчетная ведомость расхода горючего и масла по путевым листам автомобиля ` +
    `${vehicle.model} №${registrationNumber}`
  return [
    `<div class="doc-title">${escapeHtml(title)}<br>`,
    `за ${escapeHtml(longDate(period.start))} - ${escapeHtml(longDate(period.end))}</div>`,
    `<div class="norm-text">${escapeHtml(vehicle.normText)}</div>`,
  ].join('')
}

function documentNotesHtml(state, vehicle, registrationNumber) {
  const confirmationVehicle = `${vehicle.model} №${registrationNumber}`
  return [
    '<div class="doc-notes">',
    '<b>Примечание:</b> Полученные в автомобильной службе неиспользованные путевые листы ',
    'наравне с использованными также заносятся в данную расчетную ведомость, в графе ',
    '«примечание» такие путевые листы указываются как «неиспользованные».<br>',
    '<b>Исправления, подтирания, замазывания в данной расчетной ведомости НЕ ДОПУСКАЕТСЯ.</b><br>',
    'Данные указанные в расчетной ведомости по пробегу и расходу горючего ',
    `${escapeHtml(confirmationVehicle)} <b>подтверждаю.</b>`,
    '</div>',
    `<div class="doc-sign">${escapeHtml(state.settings.unit)}`,
    `<div class="signline">${escapeHtml(state.settings.rank)}`,
    `<span>__________</span>${escapeHtml(state.settings.commander)}</div></div>`,
  ].join('')
}

export function documentBodyHtml(state, period, statement, vehicle) {
  const trips = statement.trips || []
  const statementTotals = totals(statement)
  const registrationNumber = state.settings.regMode === 'short' ? vehicle.shortNo : vehicle.reg
  const totalWork = totalWorkText(trips, vehicle)
  const workColumnTitle = vehicle.hasMotohours ? 'Отработано моточасов' : 'Пройдено километров'

  return [
    '<div class="paper">',
    documentHeaderHtml(period, vehicle, registrationNumber),
    '<table class="doc-table"><thead><tr>',
    '<th>№ п/п</th><th>Дата путевого листа</th><th>Номер путевого листа</th>',
    '<th>Показания спидометра перед выездом</th><th>Показания спидометра после выезда</th>',
    '<th>Наличие в баках перед выездом</th><th>Получено</th><th>Израсходовано</th>',
    `<th>Наличие при постановке на стоянке</th><th>${workColumnTitle}</th><th>Примечание</th>`,
    '</tr></thead><tbody>',
    tripRowsHtml(state, trips, vehicle),
    statementTotalsHtml(trips, totalWork),
    materialRowsHtml(state, statement, statementTotals),
    '</tbody></table>',
    documentNotesHtml(state, vehicle, registrationNumber),
    '</div>',
  ].join('')
}

export function printHtml(state, period, statement, vehicle) {
  return [
    '<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>',
    printStyles(),
    '</style></head><body>',
    documentBodyHtml(state, period, statement, vehicle),
    '</body></html>',
  ].join('')
}
