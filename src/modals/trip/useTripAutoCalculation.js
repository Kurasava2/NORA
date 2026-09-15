import { useState } from 'react'
import { ALLOC_NONE, autoCalcSignature, calculateVehicleConsumption } from '../../lib/autoCalc.js'
import { addTripMaterial, clone, num, toleranceOf } from '../../lib/domain.js'

export default function useTripAutoCalculation({
  state,
  statement,
  vehicle,
  editingId,
  form,
  setForm,
  notify,
}) {
  const [calculationPreview, setCalculationPreview] = useState(null)
  const calculationParameters = vehicle.autoCalc?.params || []
  const calculationEnabled =
    vehicle.autoCalc?.enabled !== false && Boolean(vehicle.autoCalc?.rules?.length)
  const calculationStale =
    Boolean(form.autoCalcMeta?.signature) &&
    form.autoCalcMeta.signature !== autoCalcSignature(vehicle, form)

  const setCalculationInput = (code, value) => {
    setForm(previousForm => ({
      ...previousForm,
      calcInputs: { ...(previousForm.calcInputs || {}), [code]: value },
    }))
  }

  const runAutoCalculation = () => {
    if (form.unused) {
      notify('Неиспользованную путёвку автоматически рассчитывать не нужно.', true)
      return
    }

    const calculationResult = calculateVehicleConsumption(vehicle, form, state.catalog)
    setCalculationPreview(calculationResult)
    if (calculationResult.errors?.length) {
      notify('Автоматический расчёт требует проверки параметров.', true)
    }
  }

  const applyAutoCalculation = () => {
    if (!calculationPreview?.ok) return

    if (calculationPreview.signature !== autoCalcSignature(vehicle, form)) {
      notify('Данные путёвки изменились после расчёта. Рассчитайте ещё раз.', true)
      setCalculationPreview(null)
      return
    }

    setForm(previousForm => {
      const nextForm = clone(previousForm)
      for (const rule of calculationPreview.rules) {
        if (rule.allocation === ALLOC_NONE) continue

        for (const allocation of rule.allocations) {
          if (allocation.locked) continue

          const spentValue = num(allocation.spent) || 0
          if (
            spentValue <= toleranceOf(state.settings.tolerance) &&
            !nextForm.gsm?.[allocation.material]
          ) {
            continue
          }

          let materialEntry = nextForm.gsm?.[allocation.material]
          if (!materialEntry) {
            const seededForm = addTripMaterial(
              state,
              statement,
              nextForm,
              allocation.material,
              editingId,
            )
            materialEntry = seededForm.gsm[allocation.material]
            nextForm.gsm = seededForm.gsm
          }

          materialEntry.spent = allocation.spent
          materialEntry.end = allocation.end
          materialEntry._autoTarget = ''
          materialEntry._calcSource = 'auto'
        }
      }

      nextForm.autoCalcMeta = {
        signature: calculationPreview.signature,
        calculatedAt: new Date().toISOString(),
        rules: calculationPreview.rules.map(rule => ({
          id: rule.id,
          code: rule.code,
          value: rule.value,
        })),
      }
      return nextForm
    })

    setCalculationPreview(null)
    notify('Автоматический расход применён. Его можно изменить вручную.')
  }

  return {
    calculationPreview,
    setCalculationPreview,
    calculationParameters,
    calculationEnabled,
    calculationStale,
    setCalculationInput,
    runAutoCalculation,
    applyAutoCalculation,
    resetCalculationPreview: () => setCalculationPreview(null),
  }
}
