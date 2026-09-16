import { useCallback } from 'react'
import {
  periodMonthName,
  periodYear,
  safeFile,
  validateStatement,
  vehicleOf,
} from '../../lib/domain.js'
import { xlsxModel } from '../../lib/document.js'
import { loadTemplateEngine, reportRendererError } from '../../lib/runtime.js'
import { countForm, RU_FORMS } from '../../lib/ru.js'
import { freshPeriodContext } from '../../lib/workbook/freshCarry.js'
import { loadTemplateBytes } from '../../lib/workbook/templateSource.js'

function statementForVehicle(period, vehicleId) {
  return (
    (period.statements || []).find(statement => statement.vehicleId === vehicleId) || {
      id: `idle_${vehicleId}`,
      vehicleId,
      materials: [],
      trips: [],
      opening: { odo: null, gsm: {} },
    }
  )
}

export default function usePeriodWorkbookExport({
  state,
  notify,
  confirmAction,
  runExclusive,
  saveRenderedXlsx,
}) {
  return useCallback(
    period => {
      return runExclusive('экспорт периода', async () => {
        const fresh = freshPeriodContext(state, period?.id) || { state, period }
        const errorCount = (fresh.period.statements || []).reduce(
          (totalErrors, statement) =>
            totalErrors + validateStatement(fresh.state, statement, fresh.period).errors.length,
          0,
        )

        if (errorCount) {
          const shouldExport = await confirmAction({
            title: 'Экспортировать период с ошибками?',
            message: `В периоде найдено ${countForm(errorCount, RU_FORMS.error)}.`,
            confirmText: 'Экспортировать',
            danger: false,
          })
          if (!shouldExport) return
        }

        try {
          const workbookModels = (fresh.state.vehicles || []).map(baseVehicle => {
            const vehicle = vehicleOf(fresh.state, baseVehicle.id)
            const statement = statementForVehicle(fresh.period, baseVehicle.id)
            return xlsxModel(fresh.state, fresh.period, statement, vehicle)
          })

          const { renderBook } = await loadTemplateEngine()
          const workbookBytes = await renderBook(await loadTemplateBytes(), workbookModels)
          await saveRenderedXlsx(
            workbookBytes,
            safeFile(`Ведомости_ГСМ_${periodMonthName(fresh.period)}_${periodYear(fresh.period)}.xlsx`),
          )
        } catch (error) {
          reportRendererError('xlsx:exportPeriod', error)
          notify(error.message, true)
        }
      })
    },
    [state, notify, confirmAction, runExclusive, saveRenderedXlsx],
  )
}
