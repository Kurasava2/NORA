import { useState } from 'react'
import { autoAllocateMaterial } from '../../lib/decodings/allocations.js'
import { replaceCarryMovements } from '../../lib/decodings/balances.js'
import { createDensityMovement } from '../../lib/decodings/model.js'

function reallocate(nextState, documentId, materialName) {
  const nextDocument = nextState.decoding.documents.find(item => item.id === documentId)
  if (!nextDocument || !materialName) return []
  replaceCarryMovements(nextState.decoding, nextDocument)
  const result = autoAllocateMaterial(nextState.decoding, nextDocument, materialName)
  nextState.decoding.allocations = result.allocations
  return result.shortages
}

function resultMessage(action, shortages) {
  if (!shortages.length) return `${action}. Расход пересчитан по плотностям.`
  return `${action}. Не хватило известных плотностей в ${shortages.length} путёвках.`
}

export default function useDensityMovementEditor({
  period,
  document,
  materialName,
  mutate,
  notify,
  confirmAction,
}) {
  const [open, setOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState(null)

  const close = () => {
    setOpen(false)
    setEditingMovement(null)
  }

  const openNew = () => {
    setEditingMovement(null)
    setOpen(true)
  }

  const openEdit = movement => {
    setEditingMovement(movement)
    setOpen(true)
  }

  const save = movementForm => {
    let shortages = []
    mutate(nextState => {
      const saved = createDensityMovement({
        period,
        materialName,
        ...movementForm,
        id: editingMovement?.id,
        createdAt: editingMovement?.createdAt,
      })
      if (editingMovement) {
        const index = nextState.decoding.densityMovements
          .findIndex(item => item.id === editingMovement.id)
        if (index >= 0) nextState.decoding.densityMovements[index] = saved
      } else {
        nextState.decoding.densityMovements.push(saved)
      }
      shortages = reallocate(nextState, document.id, materialName)
    })
    const action = editingMovement ? 'Запись обновлена' : 'Запись сохранена'
    close()
    notify(resultMessage(action, shortages), Boolean(shortages.length))
  }

  const remove = async movement => {
    const approved = await confirmAction({
      title: 'Удалить запись плотности?',
      message: 'Удалится только эта ручная запись. Автомобильная ведомость не изменится.',
      confirmText: 'Удалить',
      danger: true,
    })
    if (!approved) return
    let shortages = []
    mutate(nextState => {
      nextState.decoding.densityMovements = nextState.decoding.densityMovements
        .filter(item => item.id !== movement.id)
      shortages = reallocate(nextState, document.id, materialName)
    })
    notify(resultMessage('Запись удалена', shortages), Boolean(shortages.length))
  }

  const runAuto = () => {
    let shortages = []
    mutate(nextState => {
      shortages = reallocate(nextState, document.id, materialName)
    })
    notify(
      shortages.length
        ? `Расход распределён частично: не хватило известных плотностей в ${shortages.length} путёвках.`
        : 'Расход распределён по доступным плотностям.',
      Boolean(shortages.length),
    )
  }

  return { open, editingMovement, close, openNew, openEdit, save, remove, runAuto }
}
