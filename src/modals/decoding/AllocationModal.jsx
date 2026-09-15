import React, { useEffect, useMemo, useState } from 'react'
import { Button, Field, Modal } from '../../components/ui.jsx'
import {
  allocationsForRow,
  distributedLiters,
} from '../../lib/decodings/allocations.js'
import { decimalMultiply } from '../../lib/decodings/decimal.js'
import { materialLots } from '../../lib/decodings/selectors.js'

export default function AllocationModal({
  open,
  onClose,
  decodingState,
  document,
  row,
  onSave,
}) {
  const [values, setValues] = useState({})
  const lots = useMemo(
    () => (row ? materialLots(decodingState, row.materialName) : []),
    [decodingState, row],
  )

  useEffect(() => {
    if (!open || !row || !document) return
    const nextValues = {}
    for (const allocation of allocationsForRow(decodingState, document.id, row)) {
      nextValues[allocation.lotId] = allocation.liters
    }
    setValues(nextValues)
  }, [open, row, document, decodingState])

  if (!row || !document) return null
  const currentTotal = distributedLiters(
    {
      ...decodingState,
      allocations: Object.entries(values).map(([lotId, liters]) => ({
        decodingId: document.id,
        statementId: row.statementId,
        materialName: row.materialName,
        kind: 'spent',
        lotId,
        liters,
      })),
    },
    document.id,
    row,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Распределение · ${row.vehicleShortNo}`}
      subtitle={`${row.materialName} · исходный расход ${row.spent} л`}
      wide
    >
      <div className="modal-body">
        <div className="allocation-list">
          {lots.map(lot => (
            <div className="allocation-row" key={lot.id}>
              <div>
                <b>ρ {String(lot.density).replace('.', ',')}</b>
                <small>{lot.date} · остаток партии {lot.remaining ?? '—'} л</small>
              </div>
              <Field label="Литры">
                <input
                  className="input num-input"
                  value={values[lot.id] ?? ''}
                  onChange={event => setValues(previous => ({
                    ...previous,
                    [lot.id]: event.target.value,
                  }))}
                />
              </Field>
              <div className="allocation-mass">
                <span>кг</span>
                <b>{decimalMultiply(values[lot.id] || '0', lot.density) || '0'}</b>
              </div>
            </div>
          ))}
          {!lots.length && (
            <div className="notice">Сначала добавьте хотя бы одну партию этого материала.</div>
          )}
        </div>
        <div className="allocation-total">
          <span>Распределено</span>
          <b>{currentTotal} / {row.spent} л</b>
        </div>
      </div>
      <div className="modal-actions">
        <Button type="button" onClick={onClose}>Отмена</Button>
        <Button primary type="button" onClick={() => onSave(values)}>Сохранить вручную</Button>
      </div>
    </Modal>
  )
}
