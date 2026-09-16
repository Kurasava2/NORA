import React from 'react'
import { classNames } from '../../components/ui.jsx'

const SETTINGS_SECTIONS = [
  { id: 'general', mark: 'О', label: 'Основные', hint: 'Реквизиты и документы' },
  { id: 'behavior', mark: 'Р', label: 'Работа', hint: 'Сохранение и скорость' },
  { id: 'excel', mark: 'X', label: 'Excel', hint: 'Шаблон ведомости' },
  { id: 'print', mark: 'П', label: 'Печать', hint: 'Принтер и режим печати' },
]

export default function SettingsNavigation({ activeSection, onChange }) {
  return (
    <nav className="settings-nav" aria-label="Разделы настроек">
      {SETTINGS_SECTIONS.map(section => (
        <button
          type="button"
          key={section.id}
          className={classNames(
            'settings-nav-item',
            activeSection === section.id && 'active',
          )}
          onClick={() => onChange(section.id)}
        >
          <span className="settings-nav-mark">{section.mark}</span>
          <span>
            <b>{section.label}</b>
            <small>{section.hint}</small>
          </span>
        </button>
      ))}
    </nav>
  )
}
