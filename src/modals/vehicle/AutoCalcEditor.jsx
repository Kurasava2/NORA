import React from 'react'
import { Button } from '../../components/ui.jsx'
import AutoCalcParameters from './AutoCalcParameters.jsx'
import AutoCalcRuleCard from './AutoCalcRuleCard.jsx'
import useAutoCalcEditor from './useAutoCalcEditor.js'

export default function AutoCalcEditor({ form, setForm, catalog }) {
  const editor = useAutoCalcEditor({ form, setForm, catalog })

  return (
    <section className="vehicle-auto-section span-2">
      <div className="section-heading">
        <div>
          <h3>Автоматический расчёт расхода</h3>
          <p>
            Формулы хранятся в карточке машины. В путёвке расчёт запускается только по кнопке и
            всегда остаётся доступным для ручной правки.
          </p>
        </div>
        <label className="calc-enable">
          <input
            type="checkbox"
            checked={editor.autoCalculation.enabled !== false}
            onChange={event =>
              editor.updateAutoCalculation(autoCalc => {
                autoCalc.enabled = event.target.checked
              })
            }
          />
          <span>Включён</span>
        </label>
      </div>

      <div className="auto-calc-tools">
        <Button type="button" small onClick={editor.seedBaseRule}>
          Создать базовое правило из нормы
        </Button>
        <Button type="button" small onClick={editor.addParameter}>＋ Параметр</Button>
        <Button type="button" small primary onClick={editor.addRule}>＋ Правило</Button>
      </div>

      <AutoCalcParameters
        parameters={editor.autoCalculation.params}
        onUpdate={editor.updateParameter}
        onRemove={editor.removeParameter}
      />

      <div className="calc-rule-list">
        {editor.autoCalculation.rules.map((rule, ruleIndex) => (
          <AutoCalcRuleCard
            key={rule.id}
            form={form}
            rule={rule}
            ruleIndex={ruleIndex}
            materials={editor.materials}
            onUpdate={patch => editor.updateRule(rule.id, patch)}
            onRemove={() => editor.removeRule(rule.id)}
            onToggleMaterial={materialName => editor.toggleMaterial(rule.id, materialName)}
            onMoveMaterial={(materialIndex, direction) =>
              editor.moveMaterial(rule.id, materialIndex, direction)
            }
            onAppendToken={token => editor.appendToken(rule.id, token)}
          />
        ))}
        {!editor.autoCalculation.rules.length && (
          <div className="empty-auto-rules">
            Правил пока нет. Можно создать базовое из основной нормы или добавить своё.
          </div>
        )}
      </div>
    </section>
  )
}
