import React from 'react'
import { Button, Field } from '../../components/ui.jsx'

export default function PrinterSettingsField({ form, setForm, printers, loading, onRefresh }) {
  return (
    <Field className="span-2" label="Принтер">
      <div className="printer-row">
        <select
          className="select grow"
          value={form.preferredPrinter || ''}
          onChange={event =>
            setForm(previousForm => ({ ...previousForm, preferredPrinter: event.target.value }))
          }
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
  )
}
