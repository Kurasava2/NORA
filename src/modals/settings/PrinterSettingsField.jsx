import React from 'react'
import { Button, Field } from '../../components/ui.jsx'

export default function PrinterSettingsField({ form, setForm, printers, loading, onRefresh }) {
  const updateField = (fieldName, value) => {
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))
  }

  return (
    <div className="settings-fields">
      <Field label="Принтер">
        <div className="printer-row">
          <select
            className="select grow"
            value={form.preferredPrinter || ''}
            onChange={event => updateField('preferredPrinter', event.target.value)}
          >
            <option value="">Системный диалог печати</option>
            {printers.map(printer => (
              <option key={printer.name} value={printer.name}>
                {printer.displayName}{printer.isDefault ? ' — по умолчанию' : ''}
              </option>
            ))}
          </select>
          <Button type="button" onClick={onRefresh}>{loading ? '…' : 'Обновить'}</Button>
        </div>
      </Field>
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={Boolean(form.directPrint)}
          onChange={event => updateField('directPrint', event.target.checked)}
        />
        <span>
          <b>Прямая печать</b>
          <small>Печатать без системного диалога на выбранный принтер</small>
        </span>
      </label>
    </div>
  )
}
