import React from 'react'
import { Field } from '../../components/ui.jsx'
import {
  RATE_PER_100KM,
  RATE_PER_MOTOHOUR,
  normalizeRateType,
  rateUnitLabel,
} from '../../lib/vehicleMetrics.js'

export default function VehicleFields({ form, setForm, onRateTypeChange }) {
  const rateUnit = rateUnitLabel(form)
  const motohourRate = normalizeRateType(form.rateType) === RATE_PER_MOTOHOUR
  const updateField = (fieldName, value) =>
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))

  return (
    <>
      <Field label="Номер машины">
        <input
          className="input"
          value={form.shortNo || ''}
          onChange={event => updateField('shortNo', event.target.value)}
        />
      </Field>
      <Field label="Модель">
        <input
          className="input"
          value={form.model || ''}
          onChange={event => updateField('model', event.target.value)}
        />
      </Field>
      <Field label="Регистрационный номер">
        <input
          className="input"
          value={form.reg || ''}
          onChange={event => updateField('reg', event.target.value)}
        />
      </Field>
      <Field label="Тип нормы расхода">
        <select
          className="select"
          value={normalizeRateType(form.rateType)}
          onChange={event => onRateTypeChange(event.target.value)}
        >
          <option value={RATE_PER_100KM}>л / 100 км</option>
          <option value={RATE_PER_MOTOHOUR}>л / моточас</option>
        </select>
      </Field>
      <Field label={`Норма, ${rateUnit}`}>
        <input
          className="input"
          inputMode="decimal"
          value={form.baseRate ?? ''}
          onChange={event => updateField('baseRate', event.target.value)}
        />
      </Field>
      <Field label="Вместимость бака, л">
        <input
          className="input"
          inputMode="decimal"
          value={form.tankCapacity ?? ''}
          onChange={event => updateField('tankCapacity', event.target.value)}
        />
      </Field>
      <label className="toggle-card">
        <input
          type="checkbox"
          checked={Boolean(form.hasMotohours)}
          disabled={motohourRate}
          onChange={event => updateField('hasMotohours', event.target.checked)}
        />
        <span>
          <b>Учёт моточасов</b>
          <small>
            {motohourRate
              ? 'Включён автоматически для нормы л/моточас'
              : 'Можно учитывать моточасы дополнительно к пробегу'}
          </small>
        </span>
      </label>
      <Field className="span-2" label="Текст нормы / примечание">
        <textarea
          className="textarea vehicle-norm"
          value={form.normText || ''}
          onChange={event => updateField('normText', event.target.value)}
        />
      </Field>
    </>
  )
}
