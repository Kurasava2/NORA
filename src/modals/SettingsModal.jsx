import React from 'react'
import { Button, Modal } from '../components/ui.jsx'
import GeneralSettingsFields from './settings/GeneralSettingsFields.jsx'
import PrinterSettingsField from './settings/PrinterSettingsField.jsx'
import TemplateSettingsField from './settings/TemplateSettingsField.jsx'
import useSettingsModal from './settings/useSettingsModal.js'

export default function SettingsModal(props) {
  const settings = useSettingsModal(props)
  const { open, onClose, appInfo } = props

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Настройки"
      subtitle="Реквизиты, автосохранение, Excel-шаблон и принтер"
    >
      <div className="modal-body grid-2">
        <GeneralSettingsFields form={settings.form} setForm={settings.setForm} />
        <TemplateSettingsField
          template={settings.template}
          onChoose={settings.chooseTemplate}
          onRemove={settings.removeTemplate}
        />
        <PrinterSettingsField
          form={settings.form}
          setForm={settings.setForm}
          printers={settings.printers}
          loading={settings.printersLoading}
          onRefresh={settings.refreshPrinters}
        />
      </div>
      <div className="notice subtle-notice">
        База: {appInfo?.dataPath || 'локальный профиль приложения'}. Резервные копии — только
        .gsmbackup. Electron 22 предназначен для Windows 7.
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>Отмена</Button>
        <Button primary onClick={settings.saveSettings}>Сохранить</Button>
      </div>
    </Modal>
  )
}
