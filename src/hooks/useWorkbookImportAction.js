import { useCallback } from 'react'
import {
  clone,
  createStatement,
  fmtDate,
  migrateState,
  uid,
  vehicleOf,
} from '../lib/domain.js'
import { loadTemplateEngine, reportRendererError } from '../lib/runtime.js'
import { countForm, RU_FORMS } from '../lib/ru.js'

const MAX_IMPORT_BYTES = 64 * 1024 * 1024

export default function useWorkbookImportAction({
  state,
  history,
  notify,
  confirmAction,
  runExclusive,
  goPeriod,
}) {
  return useCallback(
    file => {
      return runExclusive('импорт Excel', async () => {
        if (!file) return
        if (file.size > MAX_IMPORT_BYTES) {
          notify(
            'Файл XLSX больше 64 МБ. Импорт заблокирован для защиты памяти 32-битной сборки.',
            true,
          )
          return
        }

        try {
          const { importMonth } = await loadTemplateEngine()
          const importResult = await importMonth(
            await file.arrayBuffer(),
            state.vehicles || [],
            state.catalog,
          )
          const importedPeriod = importResult.period
          const periodAlreadyExists = state.periods.some(
            period => period.start === importedPeriod.start && period.end === importedPeriod.end,
          )

          if (periodAlreadyExists) {
            const shouldReplace = await confirmAction({
              title: 'Заменить существующий период?',
              message: `Период ${fmtDate(importedPeriod.start)} — ${fmtDate(importedPeriod.end)} уже существует.`,
              confirmText: 'Заменить',
              danger: true,
            })
            if (!shouldReplace) return
          }

          const nextState = clone(state)
          nextState.periods = nextState.periods.filter(
            period =>
              !(period.start === importedPeriod.start && period.end === importedPeriod.end),
          )

          for (const materialName of importResult.unknownMaterials || []) {
            if (nextState.catalog.some(material => material.name === materialName)) continue
            nextState.catalog.push({
              id: `import_${uid()}`,
              name: materialName,
              category: /^Д[тТ](?=\s|$)/i.test(materialName) ? 'Топливо' : 'Масло',
              unit: 'л',
              aliases: [materialName],
              sourceVehicles: [],
              sourceCount: 0,
              active: true,
            })
          }

          const period = {
            id: uid(),
            reportMonth: importedPeriod.reportMonth,
            start: importedPeriod.start,
            end: importedPeriod.end,
            statements: [],
            importInfo: {
              file: file.name,
              importedAt: new Date().toISOString(),
              recognizedSheets: importResult.recognized,
              totalSheets: importResult.totalSheets,
              totalTrips: importResult.totalTrips,
              skippedOutOfPeriod: importResult.skippedOutOfPeriod || 0,
              ignoredSheets: importResult.ignored,
            },
          }
          nextState.periods.push(period)

          for (const importedStatement of importResult.statements) {
            const vehicle = vehicleOf(nextState, importedStatement.vehicleId)
            if (!vehicle) continue

            const statement = createStatement(nextState, period, vehicle)
            statement.trips = importedStatement.trips.map(importedTrip => ({
              ...importedTrip,
              id: uid(),
              seq: Date.now() + Math.random(),
              gsm: Object.fromEntries(
                Object.entries(importedTrip.gsm || {}).map(([materialName, quantity]) => [
                  materialName,
                  { ...quantity, _carried: false, _autoTarget: '' },
                ]),
              ),
            }))
            period.statements.push(statement)
          }

          history.commit(migrateState(nextState))
          goPeriod(period.id)
          notify(
            `Импортировано ${countForm(importResult.totalTrips, RU_FORMS.trip)} · ${countForm(importResult.statements.length, RU_FORMS.vehicle)}${
              importResult.skippedOutOfPeriod
                ? ` · пропущено строк прошлого периода: ${importResult.skippedOutOfPeriod}`
                : ''
            }`,
          )
        } catch (error) {
          reportRendererError('xlsx:importMonth', error)
          notify(`Ошибка импорта книги: ${error.message}`, true)
        }
      })
    },
    [state, history, notify, confirmAction, runExclusive, goPeriod],
  )
}
