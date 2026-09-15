import React, { useCallback } from 'react'
import AppDialogs from './components/AppDialogs.jsx'
import AppSidebar from './components/AppSidebar.jsx'
import AppWorkspace from './components/AppWorkspace.jsx'
import AppStartupScreen from './components/AppStartupScreen.jsx'
import { TitleBar, classNames } from './components/ui.jsx'
import useActiveWorkspace from './hooks/useActiveWorkspace.js'
import useAppModals from './hooks/useAppModals.js'
import useAppNavigation from './hooks/useAppNavigation.js'
import useAppPersistence from './hooks/useAppPersistence.js'
import useBackupActions from './hooks/useBackupActions.js'
import useConfirmation from './hooks/useConfirmation.js'
import useExclusiveOperation from './hooks/useExclusiveOperation.js'
import useHistoryState from './hooks/useHistoryState.js'
import useKeyboardHistory from './hooks/useKeyboardHistory.js'
import useMutableAppState from './hooks/useMutableAppState.js'
import usePeriodDeleteActions from './hooks/usePeriodDeleteActions.js'
import useToast from './hooks/useToast.js'
import useWorkbookExportActions from './hooks/useWorkbookExportActions.js'
import useWorkbookImportAction from './hooks/useWorkbookImportAction.js'
import { DEFAULT_STATE, migrateState } from './lib/domain.js'

export default function App() {
  const history = useHistoryState(migrateState(DEFAULT_STATE), 50)
  const state = history.state
  const navigation = useAppNavigation()
  const modals = useAppModals()
  const { periods, activePeriod, activeStatement, activeVehicle } = useActiveWorkspace(
    state,
    navigation.view,
  )

  const { toast, notify } = useToast()
  const { confirmDialog, confirmAction, resolveConfirm } = useConfirmation()
  const runExclusive = useExclusiveOperation(notify)

  const mutateState = useMutableAppState(history)

  const persistence = useAppPersistence({
    state,
    history,
    notify,
    confirmAction,
    goHome: navigation.goHome,
  })
  useKeyboardHistory({ undo: history.undo, redo: history.redo })

  const { exportBackup, importBackup } = useBackupActions({
    state,
    history,
    notify,
    confirmAction,
    runExclusive,
    goHome: navigation.goHome,
    setLoadError: persistence.setLoadError,
    setSaveError: persistence.setSaveError,
  })

  const workbookActions = useWorkbookExportActions({ state, notify, confirmAction, runExclusive })
  const importMonthBook = useWorkbookImportAction({
    state,
    history,
    notify,
    confirmAction,
    runExclusive,
    goPeriod: navigation.goPeriod,
  })
  const { deletePeriod, deleteYear } = usePeriodDeleteActions({
    state,
    mutate: mutateState,
    confirmAction,
    goHome: navigation.goHome,
  })

  const getPreviewHtml = useCallback(
    () => workbookActions.getPreviewHtml(activePeriod, activeStatement, activeVehicle),
    [workbookActions.getPreviewHtml, activePeriod, activeStatement, activeVehicle],
  )

  const startupScreen = (
    <AppStartupScreen
      persistence={persistence}
      importBackup={importBackup}
      confirmDialog={confirmDialog}
      resolveConfirm={resolveConfirm}
    />
  )
  if (!persistence.ready || persistence.loadError) return startupScreen

  return (
    <div
      className={classNames(
        'desktop-root',
        state.settings.performanceMode !== false && 'performance-mode',
      )}
    >
      <TitleBar
        appInfo={persistence.appInfo}
        onClose={persistence.closeApp}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />

      <div className="app-shell">
        <AppSidebar
          viewName={navigation.view.name}
          autosaveEnabled={state.settings.autosave !== false}
          saveError={persistence.saveError}
          appInfo={persistence.appInfo}
          onHome={navigation.goHome}
          onVehicles={() => navigation.navigate({ name: 'vehicles' })}
          onCatalog={() => navigation.navigate({ name: 'catalog' })}
          onSettings={modals.openSettingsModal}
          onSave={() => persistence.saveCurrent(true)}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />

        <AppWorkspace
          view={navigation.view}
          state={state}
          periods={periods}
          activePeriod={activePeriod}
          activeStatement={activeStatement}
          activeVehicle={activeVehicle}
          mutate={mutateState}
          notify={notify}
          confirmAction={confirmAction}
          getPreviewHtml={getPreviewHtml}
          onNewPeriod={modals.openPeriodModal}
          onOpenPeriod={navigation.goPeriod}
          onImportMonth={importMonthBook}
          onDeletePeriod={deletePeriod}
          onDeleteYear={deleteYear}
          onOpenStatement={navigation.goStatement}
          onExportPeriod={() => workbookActions.exportPeriod(activePeriod)}
          onVehicleHistory={navigation.goHistory}
          onStatementBack={() => navigation.goPeriod(activePeriod?.id)}
          onStatementHistory={() => navigation.goHistory(activeVehicle?.id)}
          onPreview={navigation.showPreview}
          onExportStatement={() => workbookActions.exportStatement(activePeriod, activeStatement)}
          onPrintStatement={() => workbookActions.printStatement(activePeriod, activeStatement)}
          onPreviewBack={navigation.leavePreview}
          onAddVehicle={() => modals.openVehicleModal(null)}
          onEditVehicle={modals.openVehicleModal}
          onAddMaterial={modals.openMaterialModal}
          onVehiclesBack={() => navigation.navigate({ name: 'vehicles' })}
        />

        <AppDialogs
          modals={modals}
          state={state}
          mutate={mutateState}
          notify={notify}
          appInfo={persistence.appInfo}
          confirmAction={confirmAction}
          confirmDialog={confirmDialog}
          resolveConfirm={resolveConfirm}
          toast={toast}
          onPeriodCreated={period => {
            modals.closePeriodModal()
            navigation.goPeriod(period.id)
          }}
        />
      </div>
    </div>
  )
}
