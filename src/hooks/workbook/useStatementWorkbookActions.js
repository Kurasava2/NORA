import { useCallback } from 'react'
import { safeFile, validateStatement, vehicleOf } from '../../lib/domain.js'
import { xlsxModel } from '../../lib/document.js'
import { loadTemplateEngine, reportRendererError } from '../../lib/runtime.js'
import { countForm, RU_FORMS } from '../../lib/ru.js'
import { freshStatementContext } from '../../lib/workbook/freshCarry.js'
import { loadTemplateBytes } from '../../lib/workbook/templateSource.js'

async function confirmInvalidStatement(confirmAction, validation, action) {
  if (!validation.errors.length) return true

  const isPrint = action === 'print'
  return confirmAction({
    title: isPrint ? 'Печатать с ошибками?' : 'Экспортировать с ошибками?',
    message: `Найдено ${countForm(validation.errors.length, RU_FORMS.error)}.${
      isPrint ? '' : ' XLSX всё равно будет создан.'
    }`,
    confirmText: isPrint ? 'Печатать' : 'Экспортировать',
    danger: false,
  })
}

function freshContext(state, period, statement) {
  return freshStatementContext(state, period?.id, statement?.id) || {
    state,
    period,
    statement,
  }
}

export default function useStatementWorkbookActions({
  state,
  notify,
  confirmAction,
  runExclusive,
  saveRenderedXlsx,
}) {
  const exportStatement = useCallback(
    (period, statement) => {
      return runExclusive('экспорт ведомости', async () => {
        const fresh = freshContext(state, period, statement)
        const vehicle = vehicleOf(fresh.state, fresh.statement.vehicleId)
        const validation = validateStatement(fresh.state, fresh.statement, fresh.period)
        if (!(await confirmInvalidStatement(confirmAction, validation, 'export'))) return

        try {
          const { render } = await loadTemplateEngine()
          const workbookBytes = await render(
            await loadTemplateBytes(),
            xlsxModel(fresh.state, fresh.period, fresh.statement, vehicle),
          )
          await saveRenderedXlsx(
            workbookBytes,
            safeFile(`Ведомость_${vehicle.shortNo}_${fresh.period.start}_${fresh.period.end}.xlsx`),
          )
        } catch (error) {
          reportRendererError('xlsx:exportStatement', error)
          notify(error.message, true)
        }
      })
    },
    [state, notify, confirmAction, runExclusive, saveRenderedXlsx],
  )

  const printStatement = useCallback(
    (period, statement) => {
      return runExclusive('печать', async () => {
        const fresh = freshContext(state, period, statement)
        const vehicle = vehicleOf(fresh.state, fresh.statement.vehicleId)
        const validation = validateStatement(fresh.state, fresh.statement, fresh.period)
        if (!(await confirmInvalidStatement(confirmAction, validation, 'print'))) return

        if (!window.desktopAPI?.isElectron) {
          window.print()
          return
        }

        const directPrint = fresh.state.settings.directPrint && fresh.state.settings.preferredPrinter
        try {
          const { renderHtml } = await loadTemplateEngine()
          const html = await renderHtml(
            await loadTemplateBytes(),
            xlsxModel(fresh.state, fresh.period, fresh.statement, vehicle),
            true,
          )
          const printResult = await window.desktopAPI.printHtml(html, {
            silent: Boolean(directPrint),
            deviceName: directPrint ? fresh.state.settings.preferredPrinter : '',
          })

          if (printResult?.success) {
            notify(directPrint ? 'Отправлено на принтер' : 'Печать завершена')
          } else {
            notify(printResult?.error || 'Ошибка печати', true)
          }
        } catch (error) {
          reportRendererError('print', error)
          notify(`Ошибка печати: ${error?.message || error}`, true)
        }
      })
    },
    [state, notify, confirmAction, runExclusive],
  )

  const getPreviewHtml = useCallback(
    async (period, statement, vehicle) => {
      if (!period || !statement || !vehicle) throw new Error('Ведомость не выбрана.')
      const fresh = freshContext(state, period, statement)
      const freshVehicle = vehicleOf(fresh.state, fresh.statement.vehicleId)
      const { renderHtml } = await loadTemplateEngine()
      return renderHtml(
        await loadTemplateBytes(),
        xlsxModel(fresh.state, fresh.period, fresh.statement, freshVehicle),
        false,
      )
    },
    [state],
  )

  return { exportStatement, printStatement, getPreviewHtml }
}
