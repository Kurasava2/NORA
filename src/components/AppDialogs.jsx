import React from 'react'
import MaterialModal from '../modals/MaterialModal.jsx'
import PeriodModal from '../modals/PeriodModal.jsx'
import SettingsModal from '../modals/SettingsModal.jsx'
import VehicleModal from '../modals/VehicleModal.jsx'
import { ConfirmDialog, classNames } from './ui.jsx'

export default function AppDialogs({
  modals,
  state,
  mutate,
  notify,
  appInfo,
  confirmAction,
  confirmDialog,
  resolveConfirm,
  toast,
  onPeriodCreated,
}) {
  return (
    <>
      <PeriodModal
        open={modals.periodModalOpen}
        onClose={modals.closePeriodModal}
        state={state}
        mutate={mutate}
        notify={notify}
        onCreated={onPeriodCreated}
      />
      <SettingsModal
        open={modals.settingsModalOpen}
        onClose={modals.closeSettingsModal}
        state={state}
        mutate={mutate}
        notify={notify}
        appInfo={appInfo}
        confirmAction={confirmAction}
      />
      <MaterialModal
        open={modals.materialModalOpen}
        onClose={modals.closeMaterialModal}
        state={state}
        mutate={mutate}
        notify={notify}
      />
      <VehicleModal
        open={modals.vehicleModalState.open}
        vehicle={modals.vehicleModalState.vehicle}
        onClose={modals.closeVehicleModal}
        state={state}
        mutate={mutate}
        notify={notify}
      />
      <ConfirmDialog dialog={confirmDialog} onResolve={resolveConfirm} />
      {toast && (
        <div className={classNames('toast', toast.bad && 'toast-bad')}>{toast.message}</div>
      )}
    </>
  )
}
