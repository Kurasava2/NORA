import React from 'react'
import { Button } from '../../components/ui.jsx'
import { materialDisplayName } from '../../lib/domain.js'
import CalcPreview from './CalcPreview.jsx'
import MaterialEntry from './MaterialEntry.jsx'
import SectionStep from './SectionStep.jsx'

export default function TripMaterialsSection({
  stepNumber,
  state,
  form,
  materials,
  autoCalculation,
}) {
  return (
    <SectionStep number={String(stepNumber)} title="ГСМ и масла" subtitle="ручной ввод всегда имеет приоритет">
      <div className="inline-add">
        <select
          className="select grow"
          value={materials.materialPick}
          onChange={event => materials.setMaterialPick(event.target.value)}
        >
          <option value="">Выберите тип ГСМ / масла…</option>
          {materials.availableMaterials.map(material => (
            <option key={material.name} value={material.name}>
              {material.category} — {materialDisplayName(material.name)}
            </option>
          ))}
        </select>
        <Button type="button" onClick={materials.addMaterial} disabled={!materials.materialPick}>
          ＋ Добавить
        </Button>
        {autoCalculation.calculationEnabled && (
          <Button type="button" primary onClick={autoCalculation.runAutoCalculation}>
            ⚙ Рассчитать автоматически
          </Button>
        )}
      </div>

      {autoCalculation.calculationStale && (
        <div className="notice calc-stale">
          Пробег, моточасы, параметры или остатки изменились после последнего AUTO-расчёта.
          Нажмите «Рассчитать автоматически» ещё раз.
        </div>
      )}

      <CalcPreview
        preview={autoCalculation.calculationPreview}
        onApply={autoCalculation.applyAutoCalculation}
        onClose={() => autoCalculation.setCalculationPreview(null)}
        tolerance={state.settings.tolerance}
      />

      <div className="material-rows">
        {Object.keys(form.gsm || {}).map(materialName => (
          <MaterialEntry
            key={materialName}
            name={materialName}
            entry={form.gsm[materialName]}
            onChange={(fieldName, value) =>
              materials.setMaterialValue(materialName, fieldName, value)
            }
            onRemove={() => materials.removeMaterial(materialName)}
            tolerance={state.settings.tolerance}
          />
        ))}
      </div>
    </SectionStep>
  )
}
