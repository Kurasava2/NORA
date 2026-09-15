import React from 'react'
import { Button, Field } from '../../components/ui.jsx'
import { normalizeCalcCode } from '../../lib/autoCalc.js'

export default function AutoCalcParameters({ parameters, onUpdate, onRemove }) {
  if (!parameters.length) return null

  return (
    <div className="calc-param-list">
      <h4>Дополнительные входные параметры путёвки</h4>
      {parameters.map(parameter => (
        <div className="calc-param-row" key={parameter.id}>
          <Field label="Название">
            <input
              className="input"
              value={parameter.label || ''}
              onChange={event => onUpdate(parameter.id, { label: event.target.value })}
            />
          </Field>
          <Field label="Код в формуле">
            <input
              className="input"
              value={parameter.code || ''}
              onChange={event =>
                onUpdate(parameter.id, { code: normalizeCalcCode(event.target.value) })
              }
            />
          </Field>
          <Field label="Значение по умолчанию">
            <input
              className="input"
              inputMode="decimal"
              value={parameter.defaultValue ?? ''}
              onChange={event => onUpdate(parameter.id, { defaultValue: event.target.value })}
            />
          </Field>
          <Button type="button" small danger onClick={() => onRemove(parameter.id)}>
            Удалить
          </Button>
        </div>
      ))}
    </div>
  )
}
