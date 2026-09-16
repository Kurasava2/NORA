import { useCallback, useMemo, useState } from 'react'
import { addTripMaterial, smartBalance } from '../../lib/domain.js'

const EMPTY_MATERIAL_ENTRY = {
  start: '',
  received: '',
  spent: '',
  end: '',
  _autoTarget: '',
  _carried: false,
  _calcSource: '',
}

export default function useTripMaterials({
  state,
  statement,
  editingId,
  insertionPosition,
  form,
  setForm,
}) {
  const [materialPick, setMaterialPick] = useState('')

  const setMaterialValue = useCallback((materialName, fieldName, value) => {
    setForm(previousForm => {
      const materialEntry = {
        ...(previousForm.gsm?.[materialName] || EMPTY_MATERIAL_ENTRY),
        [fieldName]: value,
      }

      if (fieldName === 'start') materialEntry._carried = false
      if (fieldName === 'spent' || fieldName === 'end') {
        const hasManualValue = String(value ?? '').trim() !== ''
        materialEntry._calcSource = hasManualValue ? 'manual' : ''
      }

      const currentAutoTarget = materialEntry._autoTarget || ''
      if (fieldName === currentAutoTarget) {
        materialEntry._autoTarget = ''
      } else if (currentAutoTarget) {
        Object.assign(materialEntry, smartBalance(materialEntry, currentAutoTarget))
      }

      if (!materialEntry._autoTarget) {
        const materialFields = ['start', 'received', 'spent', 'end']
        const emptyFields = materialFields.filter(
          candidateField => String(materialEntry[candidateField] ?? '').trim() === '',
        )
        if (emptyFields.length === 1 && emptyFields[0] !== fieldName) {
          materialEntry._autoTarget = emptyFields[0]
          Object.assign(materialEntry, smartBalance(materialEntry, emptyFields[0]))
        }
      }

      return {
        ...previousForm,
        gsm: { ...previousForm.gsm, [materialName]: materialEntry },
      }
    })
  }, [setForm])

  const addMaterial = useCallback(() => {
    if (!materialPick) return
    setForm(previousForm =>
      addTripMaterial(
        state,
        statement,
        { ...previousForm, gsm: { ...(previousForm.gsm || {}) } },
        materialPick,
        editingId,
        insertionPosition,
      ),
    )
    setMaterialPick('')
  }, [editingId, insertionPosition, materialPick, setForm, state, statement])

  const removeMaterial = useCallback(materialName => {
    setForm(previousForm => {
      const gsm = { ...(previousForm.gsm || {}) }
      delete gsm[materialName]
      return { ...previousForm, gsm }
    })
  }, [setForm])

  const materialNamesKey = Object.keys(form.gsm || {}).join('\u0000')
  const availableMaterials = useMemo(() => {
    const usedMaterialNames = new Set(materialNamesKey ? materialNamesKey.split('\u0000') : [])
    return state.catalog
      .filter(material => !usedMaterialNames.has(material.name))
      .sort(
        (leftMaterial, rightMaterial) =>
          leftMaterial.category.localeCompare(rightMaterial.category) ||
          leftMaterial.name.localeCompare(rightMaterial.name),
      )
  }, [state.catalog, materialNamesKey])

  const resetMaterialPick = useCallback(() => setMaterialPick(''), [])

  return {
    materialPick,
    setMaterialPick,
    setMaterialValue,
    addMaterial,
    removeMaterial,
    availableMaterials,
    resetMaterialPick,
  }
}
