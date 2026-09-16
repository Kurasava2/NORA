import React, { useEffect, useState } from 'react'
import { Button, Modal } from '../components/ui.jsx'
import BehaviorSettingsFields from './settings/BehaviorSettingsFields.jsx'
import GeneralSettingsFields from './settings/GeneralSettingsFields.jsx'
import PrinterSettingsField from './settings/PrinterSettingsField.jsx'
import SettingsNavigation from './settings/SettingsNavigation.jsx'
import TemplateSettingsField from './settings/TemplateSettingsField.jsx'
import useSettingsModal from './settings/useSettingsModal.js'

const SECTION_COPY = {
  general: {
    title: 'Основные',
    subtitle: 'Реквизиты подразделения и параметры документов',
  },
  behavior: {
    title: 'Работа приложения',
    subtitle: 'Автосохранение и оптимизация для слабых компьютеров',
  },
  excel: {
    title: 'Excel',
    subtitle: 'Шаблон, используемый для официального экспорта ведомостей',
  },
  print: {
    title: 'Печать',
    subtitle: 'Выбор принтера и способ отправки документа на печать',
  },
}

export default function SettingsModal(props) {
  const settings = useSettingsModal(props)
  const { open, onClose, appInfo } = props
  const [activeSection, setActiveSection] = useState('general')

  useEffect(() => {
    if (open) setActiveSection('general')
  }, [open])

  const sectionCopy = SECTION_COPY[activeSection]

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Настройки"
      subtitle="Параметры приложения по разделам"
      backdropClassName="settings-modal-backdrop"
    >
      <div className="settings-layout">
        <SettingsNavigation activeSection={activeSection} onChange={setActiveSection} />
        <div className="settings-main">
          <div className="settings-pane">
            <div className="settings-section-head">
              <h3>{sectionCopy.title}</h3>
              <p>{sectionCopy.subtitle}</p>
            </div>
            {activeSection === 'general' && (
              <>
                <GeneralSettingsFields form={settings.form} setForm={settings.setForm} />
                <div className="settings-note settings-system-note">
                  <b>Локальная база</b>
                  <span>{appInfo?.dataPath || 'локальный профиль приложения'}</span>
                  <small>Резервные копии: .gsmbackup · Electron 22 · Windows 7</small>
                </div>
              </>
            )}
            {activeSection === 'behavior' && (
              <BehaviorSettingsFields form={settings.form} setForm={settings.setForm} />
            )}
            {activeSection === 'excel' && (
              <TemplateSettingsField
                template={settings.template}
                onChoose={settings.chooseTemplate}
                onRemove={settings.removeTemplate}
              />
            )}
            {activeSection === 'print' && (
              <PrinterSettingsField
                form={settings.form}
                setForm={settings.setForm}
                printers={settings.printers}
                loading={settings.printersLoading}
                onRefresh={settings.refreshPrinters}
              />
            )}
          </div>
          <div className="settings-actions">
            <Button onClick={onClose}>Отмена</Button>
            <Button primary onClick={settings.saveSettings}>Сохранить</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
