import React from 'react'
import { Field } from '../../components/ui.jsx'

export default function BehaviorSettingsFields({ form, setForm }) {
  const updateField = (fieldName, value) => {
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))
  }

  return (
    <div className="settings-fields">
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={form.autosave !== false}
          onChange={event => updateField('autosave', event.target.checked)}
        />
        <span>
          <b>Автосохранение</b>
          <small>Сохранять изменения локально автоматически</small>
        </span>
      </label>
      <Field label="Задержка автосохранения, мс">
        <input
          className="input"
          type="number"
          min="0"
          step="100"
          value={form.autosaveDelay ?? 400}
          onChange={event => updateField('autosaveDelay', event.target.value)}
        />
      </Field>
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={form.performanceMode !== false}
          onChange={event => updateField('performanceMode', event.target.checked)}
        />
        <span>
          <b>Режим слабого ПК</b>
          <small>Упрощает композицию, тени, анимации и прокрутку для Windows 7</small>
        </span>
      </label>
    </div>
  )
}
