import React from 'react'
import { Button, classNames } from '../../components/ui.jsx'
import { nfmt, num, toleranceOf } from '../../lib/domain.js'
import { ALLOC_NONE } from '../../lib/autoCalc.js'

export default function CalcPreview({ preview, onApply, onClose, tolerance }) {
  if (!preview) return null

  const totalShortage = (preview.rules || []).reduce(
    (shortageSum, rule) => shortageSum + (num(rule.shortage) || 0),
    0,
  )
  const hasShortage = totalShortage > toleranceOf(tolerance)
  const inputVariables = Object.entries(preview.inputVariables || {}).filter(
    ([, variableValue]) => num(variableValue) !== null,
  )

  return (
    <div className={classNames('calc-preview', preview.errors?.length && 'bad')}>
      <div className="calc-preview-head">
        <div>
          <b>Предпросмотр автоматического расчёта</b>
          <span>Числа ещё не записаны в путёвку.</span>
        </div>
        <Button type="button" small onClick={onClose}>×</Button>
      </div>

      {Boolean(preview.errors?.length) && (
        <div className="calc-preview-errors">
          {preview.errors.map((errorMessage, errorIndex) => (
            <div key={errorIndex}>• {errorMessage}</div>
          ))}
        </div>
      )}

      {!preview.errors?.length && inputVariables.length > 0 && (
        <div className="formula-meta">
          Подставлено:{' '}
          {inputVariables
            .map(([variableName, variableValue]) => `${variableName} = ${nfmt(variableValue)}`)
            .join(' · ')}
        </div>
      )}

      {!preview.errors?.length && (
        <div className="calc-preview-rules">
          {preview.rules.map(rule => (
            <div className="calc-preview-rule" key={rule.id}>
              <div className="calc-rule-result">
                <b>{rule.name}</b>
                <strong>{nfmt(rule.value)} л</strong>
                <code>{rule.formula}</code>
              </div>

              {rule.allocation === ALLOC_NONE ? (
                <div className="muted">
                  Распределение выключено — рассчитан только общий расход.
                </div>
              ) : (
                <div className="calc-allocation-preview">
                  {rule.allocations.map(allocation => (
                    <div key={allocation.material}>
                      <span>{allocation.material}</span>
                      <b>−{nfmt(allocation.spent)} л</b>
                      <small>
                        {allocation.locked ? 'MANUAL · ' : ''}
                        останется {nfmt(allocation.end)} л
                      </small>
                    </div>
                  ))}
                  {rule.manualExcess > toleranceOf(tolerance) && (
                    <div className="calc-shortage">
                      Ручной расход выше расчётного на {nfmt(rule.manualExcess)} л.
                      AUTO не изменит ручные значения.
                    </div>
                  )}
                  {rule.shortage > toleranceOf(tolerance) && (
                    <div className="calc-shortage">
                      Не хватает {nfmt(rule.shortage)} л по текущим остаткам/получению.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="calc-preview-actions">
        <Button type="button" onClick={onClose}>Отмена</Button>
        <Button
          type="button"
          primary
          disabled={Boolean(preview.errors?.length) || hasShortage}
          onClick={onApply}
        >
          Применить расчёт
        </Button>
      </div>
    </div>
  )
}
