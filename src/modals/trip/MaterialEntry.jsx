import React from 'react'
import { Button, Field, classNames } from '../../components/ui.jsx'
import { materialDisplayName, nfmt, num, toleranceOf } from '../../lib/domain.js'

const MATERIAL_FIELDS = ['start', 'received', 'spent', 'end']

export default function MaterialEntry({ name, entry, onChange, onRemove, tolerance }) {
  const numericValues = MATERIAL_FIELDS.map(fieldName => num(entry?.[fieldName]))
  const balanceDifference = numericValues.every(value => value !== null)
    ? numericValues[0] + numericValues[1] - numericValues[2] - numericValues[3]
    : null
  const balanceIsValid =
    balanceDifference !== null && Math.abs(balanceDifference) <= toleranceOf(tolerance)

  const statusText =
    entry?._calcSource === 'auto'
      ? 'AUTO'
      : entry?._calcSource === 'manual'
        ? 'MANUAL'
        : balanceIsValid
          ? '✓ баланс'
          : balanceDifference === null
            ? 'заполните значения'
            : `расхождение ${nfmt(balanceDifference)} л`

  return (
    <div className="material-entry">
      <div className="material-name">
        <b>{materialDisplayName(name)}</b>
        <span>{statusText}</span>
        <Button type="button" small danger onClick={onRemove}>Удалить</Button>
      </div>

      <div className="material-fields">
        <Field label="До">
          <input
            className="input num-input"
            value={entry?.start ?? ''}
            onChange={event => onChange('start', event.target.value)}
          />
        </Field>
        <span className="math">+</span>
        <Field label="Получено">
          <input
            className="input num-input"
            value={entry?.received ?? ''}
            onChange={event => onChange('received', event.target.value)}
          />
        </Field>
        <span className="math">−</span>
        <Field label="Расход">
          <input
            className="input num-input"
            value={entry?.spent ?? ''}
            onChange={event => onChange('spent', event.target.value)}
          />
        </Field>
        <span className="math">=</span>
        <Field label="После">
          <input
            className={classNames(
              'input num-input',
              entry?._autoTarget === 'end' && 'auto-field',
            )}
            value={entry?.end ?? ''}
            onChange={event => onChange('end', event.target.value)}
          />
        </Field>
      </div>

      <div
        className={classNames(
          'balance-line',
          balanceDifference === null ? 'neutral' : balanceIsValid ? 'ok' : 'bad',
        )}
      >
        {balanceDifference === null
          ? 'Заполните любые три поля — четвёртое будет пересчитываться автоматически.'
          : balanceIsValid
            ? 'Баланс сходится.'
            : 'Проверьте значения.'}
      </div>
    </div>
  )
}
