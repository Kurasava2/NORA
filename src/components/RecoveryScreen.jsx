import React from 'react'
import { Button, Card, ConfirmDialog, TitleBar } from './ui.jsx'

export default function RecoveryScreen({
  appInfo,
  error,
  onRestore,
  onReset,
  onClose,
  confirmDialog,
  resolveConfirm,
}) {
  return (
    <div className="desktop-root performance-mode">
      <TitleBar appInfo={appInfo} onClose={onClose} />
      <div className="recovery-screen">
        <Card className="recovery-card">
          <div className="recovery-icon">!</div>
          <h1>Локальная база не загружена</h1>
          <p>
            Приложение остановило автоматическое сохранение, чтобы не перезаписать существующие
            данные пустой базой.
          </p>
          <div className="recovery-error">{error}</div>
          {appInfo?.dataPath && <div className="recovery-path">Файл базы: {appInfo.dataPath}</div>}
          <div className="toolbar recovery-actions">
            <Button primary onClick={onRestore}>Восстановить из копии</Button>
            <Button danger onClick={onReset}>Создать пустую базу</Button>
            <Button onClick={onClose}>Закрыть</Button>
          </div>
        </Card>
      </div>
      <ConfirmDialog dialog={confirmDialog} onResolve={resolveConfirm} />
    </div>
  )
}
