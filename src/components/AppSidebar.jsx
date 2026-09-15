import React from 'react'
import { NavButton, classNames } from './ui.jsx'

export default function AppSidebar({
  viewName,
  autosaveEnabled,
  saveError,
  appInfo,
  onHome,
  onVehicles,
  onDecodings,
  onCatalog,
  onSettings,
  onSave,
  onExportBackup,
  onImportBackup,
}) {
  const statusLabel = saveError
    ? 'Ошибка сохранения'
    : autosaveEnabled
      ? 'Автосохранение активно'
      : 'Автосохранение выключено'

  const statusDetails =
    saveError ||
    (autosaveEnabled
      ? appInfo?.version
        ? `Версия ${appInfo.version}`
        : 'React · Electron'
      : 'Сохранение вручную или при выходе')

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Г</div>
        <div>
          <b>Рабочая база</b>
          <span>РАСЧЁТНЫЕ ВЕДОМОСТИ ГСМ</span>
        </div>
      </div>

      <nav className="main-nav">
        <NavButton active={viewName === 'home'} onClick={onHome} icon="⌂" label="Обзор периодов" />
        <NavButton
          active={viewName === 'vehicles' || viewName === 'history'}
          onClick={onVehicles}
          icon="▣"
          label="Автомобили"
        />
        <NavButton
          active={viewName === 'decodings'}
          onClick={onDecodings}
          icon="▦"
          label="Расшифровки"
        />
        <NavButton
          active={viewName === 'catalog'}
          onClick={onCatalog}
          icon="◫"
          label="Справочник ГСМ"
        />
      </nav>

      <div className="sidebar-spacer" />
      <div className="side-caption">Сервис</div>
      <button className="side-link" onClick={onSettings}>⚙ Настройки</button>
      <button className="side-link" onClick={onSave}>💾 Сохранить</button>
      <button className="side-link" onClick={onExportBackup}>⇩ Сделать резервную копию</button>
      <button className="side-link" onClick={onImportBackup}>⇧ Восстановить из копии</button>

      <div className="app-meta">
        <span
          className={classNames(
            'status-dot',
            saveError && 'bad',
            !autosaveEnabled && !saveError && 'off',
          )}
        />
        <div>
          <b>{statusLabel}</b>
          <span>{statusDetails}</span>
        </div>
      </div>
    </aside>
  )
}
