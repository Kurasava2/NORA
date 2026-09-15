import React from 'react'

export default function TitleBar({ appInfo, onClose, onUndo, onRedo, canUndo, canRedo }) {
  const desktopApi = window.desktopAPI
  const canControlWindow = Boolean(desktopApi?.isElectron)

  const handleDoubleClick = mouseEvent => {
    if (!mouseEvent.target.closest('button')) desktopApi?.maximizeWindow?.()
  }

  return (
    <header className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="titlebar-brand">
        <div className="titlebar-mark">Г</div>
        <div className="titlebar-copy">
          <b>ГСМ Ведомости</b>
          <span>{appInfo?.version ? `v${appInfo.version}` : 'desktop'}</span>
        </div>
      </div>

      <div className="titlebar-actions">
        <div className="history-controls">
          <button
            className="history-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Отменить (Ctrl+Z)"
            aria-label="Отменить"
          >
            ↶
          </button>
          <button
            className="history-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Повторить (Ctrl+Y)"
            aria-label="Повторить"
          >
            ↷
          </button>
        </div>

        {canControlWindow && (
          <div className="window-controls">
            <button
              className="window-btn"
              onClick={() => desktopApi?.minimizeWindow?.()}
              title="Свернуть"
              aria-label="Свернуть"
            >
              −
            </button>
            <button
              className="window-btn"
              onClick={() => desktopApi?.maximizeWindow?.()}
              title="Развернуть"
              aria-label="Развернуть"
            >
              □
            </button>
            <button
              className="window-btn window-close"
              onClick={onClose || (() => desktopApi?.closeWindow?.())}
              title="Закрыть"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
