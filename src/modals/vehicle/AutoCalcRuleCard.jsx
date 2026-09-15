import React from 'react'
import { Button, Field, classNames } from '../../components/ui.jsx'
import {
  ALLOC_MINIMIZE,
  ALLOC_PRIORITY,
  formulaIdentifiers,
  normalizeCalcCode,
} from '../../lib/autoCalc.js'
import { ALLOCATION_LABELS } from './constants.js'
import FormulaTokens from './FormulaTokens.jsx'
import SelectedMaterials from './SelectedMaterials.jsx'

function formulaParameterSummary(formula) {
  try {
    return formulaIdentifiers(formula).join(', ') || '—'
  } catch {
    return 'ошибка формулы'
  }
}

export default function AutoCalcRuleCard({
  form,
  rule,
  ruleIndex,
  materials,
  onUpdate,
  onRemove,
  onToggleMaterial,
  onMoveMaterial,
  onAppendToken,
}) {
  return (
    <div className="calc-rule-card">
      <div className="calc-rule-head">
        <div>
          <span>Правило {ruleIndex + 1}</span>
          <b>{rule.name || 'Без названия'}</b>
        </div>
        <Button type="button" small danger onClick={onRemove}>Удалить</Button>
      </div>

      <div className="grid-3 calc-rule-main">
        <Field label="Название">
          <input
            className="input"
            value={rule.name || ''}
            onChange={event => onUpdate({ name: event.target.value })}
          />
        </Field>
        <Field label="Код результата">
          <input
            className="input"
            value={rule.code || ''}
            onChange={event => onUpdate({ code: normalizeCalcCode(event.target.value) })}
          />
        </Field>
        <Field label="Округление, л">
          <input
            className="input"
            inputMode="decimal"
            value={rule.rounding ?? 0.01}
            onChange={event => onUpdate({ rounding: event.target.value })}
          />
        </Field>
      </div>

      <Field label="Формула">
        <input
          className="input formula-input"
          value={rule.formula || ''}
          placeholder="(КМ / 100) * НОРМА + 35%"
          onChange={event => onUpdate({ formula: event.target.value })}
        />
      </Field>
      <FormulaTokens form={form} rule={rule} onInsert={onAppendToken} />
      <div className="formula-meta">
        Используемые параметры: {formulaParameterSummary(rule.formula)}
      </div>

      <div className="grid-2 calc-allocation">
        <Field label="Как распределять расход">
          <select
            className="select"
            value={rule.allocation || ALLOC_MINIMIZE}
            onChange={event => onUpdate({ allocation: event.target.value })}
          >
            {Object.entries(ALLOCATION_LABELS).map(([allocationValue, allocationLabel]) => (
              <option key={allocationValue} value={allocationValue}>{allocationLabel}</option>
            ))}
          </select>
        </Field>

        <div>
          <span className="field-label">Материалы правила</span>
          <div className="material-picker-grid">
            {materials.map(material => (
              <label
                className={classNames(
                  'material-pick',
                  rule.materials?.includes(material.name) && 'selected',
                )}
                key={material.name}
              >
                <input
                  type="checkbox"
                  checked={Boolean(rule.materials?.includes(material.name))}
                  onChange={() => onToggleMaterial(material.name)}
                />
                <span>
                  <b>{material.name}</b>
                  <small>{material.category}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {rule.allocation === ALLOC_PRIORITY && (
        <>
          <div className="field-label">Приоритет списания — сверху вниз</div>
          <SelectedMaterials
            rule={rule}
            moveMaterial={onMoveMaterial}
            removeMaterial={onToggleMaterial}
          />
        </>
      )}
    </div>
  )
}
