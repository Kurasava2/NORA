import React from 'react'
import RecoveryScreen from './RecoveryScreen.jsx'

export default function AppStartupScreen({
  persistence,
  importBackup,
  confirmDialog,
  resolveConfirm,
}) {
  if (!persistence.ready) {
    return (
      <div className="loading">
        <div className="loader" />
        <b>ГСМ Ведомости</b>
        <span>Загрузка локальной базы…</span>
      </div>
    )
  }

  if (!persistence.loadError) return null

  return (
    <RecoveryScreen
      appInfo={persistence.appInfo}
      error={persistence.loadError}
      onRestore={importBackup}
      onReset={persistence.startFreshDatabase}
      onClose={() => window.desktopAPI?.closeWindow?.()}
      confirmDialog={confirmDialog}
      resolveConfirm={resolveConfirm}
    />
  )
}
