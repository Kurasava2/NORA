import React from 'react'
import CatalogView from '../views/CatalogView.jsx'
import DecodingsView from '../views/DecodingsView.jsx'
import HistoryView from '../views/HistoryView.jsx'
import HomeView from '../views/HomeView.jsx'
import PeriodView from '../views/PeriodView.jsx'
import PreviewView from '../views/PreviewView.jsx'
import StatementView from '../views/StatementView.jsx'
import VehiclesView from '../views/VehiclesView.jsx'

export default function AppWorkspace({
  view,
  state,
  periods,
  activePeriod,
  activeStatement,
  activeVehicle,
  mutate,
  notify,
  confirmAction,
  getPreviewHtml,
  onNewPeriod,
  onOpenPeriod,
  onImportMonth,
  onDeletePeriod,
  onDeleteYear,
  onOpenStatement,
  onExportPeriod,
  onVehicleHistory,
  onStatementBack,
  onStatementHistory,
  onPreview,
  onExportStatement,
  onPrintStatement,
  onPreviewBack,
  onAddVehicle,
  onEditVehicle,
  onAddMaterial,
  onVehiclesBack,
}) {
  return (
    <main className="main-content">
      {view.name === 'home' && (
        <HomeView
          state={state}
          periods={periods}
          onNew={onNewPeriod}
          onOpen={onOpenPeriod}
          onImport={onImportMonth}
          onDeletePeriod={onDeletePeriod}
          onDeleteYear={onDeleteYear}
        />
      )}

      {view.name === 'period' && activePeriod && (
        <PeriodView
          state={state}
          period={activePeriod}
          mutate={mutate}
          onOpen={statement => onOpenStatement(activePeriod.id, statement.id)}
          onExport={onExportPeriod}
          onHistory={onVehicleHistory}
        />
      )}

      {view.name === 'statement' && activePeriod && activeStatement && activeVehicle && (
        <StatementView
          state={state}
          period={activePeriod}
          statement={activeStatement}
          vehicle={activeVehicle}
          mutate={mutate}
          onBack={onStatementBack}
          onHistory={onStatementHistory}
          onPreview={onPreview}
          onExport={onExportStatement}
          onPrint={onPrintStatement}
          notify={notify}
          confirmAction={confirmAction}
        />
      )}

      {view.name === 'preview' && activePeriod && activeStatement && activeVehicle && (
        <PreviewView
          vehicle={activeVehicle}
          onBack={onPreviewBack}
          onExport={onExportStatement}
          onPrint={onPrintStatement}
          getPreviewHtml={getPreviewHtml}
        />
      )}

      {view.name === 'vehicles' && (
        <VehiclesView
          state={state}
          mutate={mutate}
          onHistory={onVehicleHistory}
          onAdd={onAddVehicle}
          onEdit={onEditVehicle}
          notify={notify}
          confirmAction={confirmAction}
        />
      )}

      {view.name === 'decodings' && (
        <DecodingsView
          state={state}
          mutate={mutate}
          notify={notify}
          confirmAction={confirmAction}
        />
      )}

      {view.name === 'catalog' && (
        <CatalogView
          state={state}
          mutate={mutate}
          onAdd={onAddMaterial}
          notify={notify}
          confirmAction={confirmAction}
        />
      )}

      {view.name === 'history' && activeVehicle && (
        <HistoryView
          state={state}
          vehicle={activeVehicle}
          onBack={onVehiclesBack}
          onOpen={(period, statement) => onOpenStatement(period.id, statement.id)}
        />
      )}
    </main>
  )
}
