import React from 'react'
import { Field } from '../../components/ui.jsx'

export default function GeneralSettingsFields({ form, setForm }) {
  const updateField = (fieldName, value) => {
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))
  }

  return (
    <>
      <Field label="Должность / подразделение">
        <input className="input" value={form.unit || ''} onChange={event => updateField('unit', event.target.value)} />
      </Field>
      <Field label="Воинское звание">
        <input className="input" value={form.rank || ''} onChange={event => updateField('rank', event.target.value)} />
      </Field>
      <Field label="Фамилия / инициалы">
        <input className="input" value={form.commander || ''} onChange={event => updateField('commander', event.target.value)} />
      </Field>
      <Field label="Допуск сравнения ГСМ, л">
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={form.tolerance ?? 0.05}
          onChange={event => updateField('tolerance', event.target.value)}
        />
      </Field>
      <Field label="Номер машины в документе">
        <select className="select" value={form.regMode || 'full'} onChange={event => updateField('regMode', event.target.value)}>
          <option value="full">Полный рег. номер</option>
          <option value="short">Короткий номер</option>
        </select>
      </Field>
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={form.autosave !== false}
          onChange={event => updateField('autosave', event.target.checked)}
        />
        <span><b>Автосохранение</b><small>Сохранять изменения локально автоматически</small></span>
      </label>
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={form.performanceMode !== false}
          onChange={event => updateField('performanceMode', event.target.checked)}
        />
        <span><b>Режим слабого ПК</b><small>Без blur, тяжёлых теней и анимаций</small></span>
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
          checked={Boolean(form.directPrint)}
          onChange={event => updateField('directPrint', event.target.checked)}
        />
        <span><b>Прямая печать</b><small>Без диалога на выбранный принтер</small></span>
      </label>
    </>
  )
}
