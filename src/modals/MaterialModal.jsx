import React, { useEffect, useState } from 'react'
import { Button, Field, Modal } from '../components/ui.jsx'
import { uid } from '../lib/domain.js'

const EMPTY_FORM = { category: 'Топливо', name: '', aliases: '' }

export default function MaterialModal({ open, onClose, state, mutate, notify }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) setForm(EMPTY_FORM)
  }, [open])

  const submit = submitEvent => {
    submitEvent.preventDefault()
    const materialName = form.name.trim()
    if (!materialName) return

    const duplicateExists = state.catalog.some(
      material => material.name.toLowerCase() === materialName.toLowerCase(),
    )
    if (duplicateExists) {
      notify('Такой тип уже есть в справочнике.', true)
      return
    }

    mutate(nextState => {
      nextState.catalog.push({
        id: `custom_${uid()}`,
        name: materialName,
        category: form.category,
        unit: 'л',
        aliases: form.aliases
          .split(',')
          .map(alias => alias.trim())
          .filter(Boolean),
        sourceVehicles: [],
        sourceCount: 0,
        active: true,
      })
    })
    notify(`Добавлен тип: ${materialName}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый тип ГСМ">
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <Field label="Категория">
            <select
              className="select"
              value={form.category}
              onChange={changeEvent =>
                setForm(previousForm => ({ ...previousForm, category: changeEvent.target.value }))
              }
            >
              <option>Топливо</option>
              <option>Масло</option>
            </select>
          </Field>
          <Field label="Единица"><input className="input" value="л" readOnly /></Field>
          <Field className="span-2" label="Наименование">
            <input
              className="input"
              value={form.name}
              onChange={changeEvent =>
                setForm(previousForm => ({ ...previousForm, name: changeEvent.target.value }))
              }
              placeholder='Например, Дт "З" или Масло М-10Г2'
            />
          </Field>
          <Field className="span-2" label="Алиасы" hint="Через запятую">
            <input
              className="input"
              value={form.aliases}
              onChange={changeEvent =>
                setForm(previousForm => ({ ...previousForm, aliases: changeEvent.target.value }))
              }
            />
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">Добавить</Button>
        </div>
      </form>
    </Modal>
  )
}
