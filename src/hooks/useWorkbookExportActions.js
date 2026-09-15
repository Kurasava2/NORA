import usePeriodWorkbookExport from './workbook/usePeriodWorkbookExport.js'
import useSaveRenderedXlsx from './workbook/useSaveRenderedXlsx.js'
import useStatementWorkbookActions from './workbook/useStatementWorkbookActions.js'

export default function useWorkbookExportActions({ state, notify, confirmAction, runExclusive }) {
  const saveRenderedXlsx = useSaveRenderedXlsx(notify)
  const exportPeriod = usePeriodWorkbookExport({
    state,
    notify,
    confirmAction,
    runExclusive,
    saveRenderedXlsx,
  })
  const statementActions = useStatementWorkbookActions({
    state,
    notify,
    confirmAction,
    runExclusive,
    saveRenderedXlsx,
  })

  return { ...statementActions, exportPeriod }
}
