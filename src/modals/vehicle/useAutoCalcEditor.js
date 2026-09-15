import { useMemo } from 'react'
import { ALLOC_MINIMIZE, defaultAutoCalcForVehicle } from '../../lib/autoCalc.js'
import { uid } from '../../lib/domain.js'
import { deepClone } from './constants.js'

export default function useAutoCalcEditor({ form, setForm, catalog }) {
  const autoCalculation = form.autoCalc || { enabled: true, params: [], rules: [] }
  const materials = useMemo(
    () =>
      [...(catalog || [])]
        .filter(material => material.active !== false)
        .sort(
          (leftMaterial, rightMaterial) =>
            String(leftMaterial.category).localeCompare(String(rightMaterial.category)) ||
            String(leftMaterial.name).localeCompare(String(rightMaterial.name)),
        ),
    [catalog],
  )

  const updateAutoCalculation = updater => {
    setForm(previousForm => {
      const nextForm = deepClone(previousForm)
      nextForm.autoCalc = nextForm.autoCalc || { enabled: true, params: [], rules: [] }
      updater(nextForm.autoCalc, nextForm)
      return nextForm
    })
  }

  const addParameter = () =>
    updateAutoCalculation(autoCalc => {
      autoCalc.params.push({
        id: `param_${uid()}`,
        code: `ПАРАМЕТР_${autoCalc.params.length + 1}`,
        label: 'Новый параметр',
        defaultValue: '',
      })
    })

  const updateParameter = (parameterId, patch) =>
    updateAutoCalculation(autoCalc => {
      const parameter = autoCalc.params.find(candidate => candidate.id === parameterId)
      if (parameter) Object.assign(parameter, patch)
    })

  const removeParameter = parameterId =>
    updateAutoCalculation(autoCalc => {
      autoCalc.params = autoCalc.params.filter(parameter => parameter.id !== parameterId)
    })

  const addRule = () =>
    updateAutoCalculation(autoCalc => {
      autoCalc.rules.push({
        id: `rule_${uid()}`,
        name: 'Новое правило',
        code: `РАСХОД_${autoCalc.rules.length + 1}`,
        formula: '',
        materials: [],
        allocation: ALLOC_MINIMIZE,
        priority: [],
        rounding: 0.01,
      })
    })

  const updateRule = (ruleId, patch) =>
    updateAutoCalculation(autoCalc => {
      const rule = autoCalc.rules.find(candidate => candidate.id === ruleId)
      if (rule) Object.assign(rule, patch)
    })

  const removeRule = ruleId =>
    updateAutoCalculation(autoCalc => {
      autoCalc.rules = autoCalc.rules.filter(rule => rule.id !== ruleId)
    })

  const seedBaseRule = () =>
    setForm(previousForm => {
      const nextForm = deepClone(previousForm)
      nextForm.autoCalc = defaultAutoCalcForVehicle(
        { ...nextForm, id: nextForm.id || 'new' },
        catalog,
      )
      return nextForm
    })

  const toggleMaterial = (ruleId, materialName) =>
    updateAutoCalculation(autoCalc => {
      const rule = autoCalc.rules.find(candidate => candidate.id === ruleId)
      if (!rule) return
      const isSelected = rule.materials.includes(materialName)
      rule.materials = isSelected
        ? rule.materials.filter(selectedName => selectedName !== materialName)
        : [...rule.materials, materialName]
      rule.priority = rule.materials.slice()
    })

  const moveMaterial = (ruleId, materialIndex, direction) =>
    updateAutoCalculation(autoCalc => {
      const rule = autoCalc.rules.find(candidate => candidate.id === ruleId)
      if (!rule) return
      const targetIndex = materialIndex + direction
      if (targetIndex < 0 || targetIndex >= rule.materials.length) return

      ;[rule.materials[materialIndex], rule.materials[targetIndex]] = [
        rule.materials[targetIndex],
        rule.materials[materialIndex],
      ]
      rule.priority = rule.materials.slice()
    })

  const appendToken = (ruleId, token) =>
    updateAutoCalculation(autoCalc => {
      const rule = autoCalc.rules.find(candidate => candidate.id === ruleId)
      if (!rule) return
      const formulaPrefix = String(rule.formula || '').trimEnd()
      rule.formula = `${formulaPrefix}${formulaPrefix ? ' ' : ''}${token} `
    })

  return {
    autoCalculation,
    materials,
    updateAutoCalculation,
    addParameter,
    updateParameter,
    removeParameter,
    addRule,
    updateRule,
    removeRule,
    seedBaseRule,
    toggleMaterial,
    moveMaterial,
    appendToken,
  }
}
