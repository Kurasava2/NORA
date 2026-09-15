import React from 'react'
import { Field } from '../../components/ui.jsx'
import SectionStep from './SectionStep.jsx'

export default function CalculationParametersSection({ parameters, form, onChange }) {
  if (!parameters.length) return null

  return (
    <SectionStep
      number="3"
      title="Параметры автоматического расчёта"
      subtitle="поля заданы в карточке машины"
    >
      <div className="grid-3">
        {parameters.map(parameter => (
          <Field key={parameter.id} label={parameter.label || parameter.code} hint={parameter.code}>
            <input
              className="input"
              inputMode="decimal"
              value={form.calcInputs?.[parameter.code] ?? ''}
              onChange={event => onChange(parameter.code, event.target.value)}
            />
          </Field>
        ))}
      </div>
    </SectionStep>
  )
}
