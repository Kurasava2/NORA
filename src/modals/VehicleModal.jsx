import React, { useEffect, useState } from 'react'
import { Button, Modal } from '../components/ui.jsx'
import { RATE_PER_MOTOHOUR, normalizeRateType } from '../lib/vehicleMetrics.js'
import AutoCalcEditor from './vehicle/AutoCalcEditor.jsx'
import VehicleFields from './vehicle/VehicleFields.jsx'
import { EMPTY_VEHICLE_FORM } from './vehicle/constants.js'
import { buildVehicleRecord, initialVehicleForm } from './vehicle/vehicleForm.js'

export default function VehicleModal({ open, onClose, state, mutate, notify, vehicle = null }) {
  const [form, setForm] = useState(EMPTY_VEHICLE_FORM)

  useEffect(() => {
    if (open) setForm(initialVehicleForm(vehicle, state.catalog))
  }, [open, vehicle?.id])

  const setRateType = value => {
    setForm(previousForm => {
      const rateType = normalizeRateType(value)
      return {
        ...previousForm,
        rateType,
        hasMotohours: rateType === RATE_PER_MOTOHOUR ? true : previousForm.hasMotohours,
      }
    })
  }

  const submit = event => {
    event.preventDefault()
    const result = buildVehicleRecord(form, vehicle, state)
    if (result.error) {
      notify(result.error, true)
      return
    }

    const vehicleRecord = result.vehicle
    mutate(nextState => {
      const vehicleIndex = (nextState.vehicles || []).findIndex(
        candidateVehicle => candidateVehicle.id === vehicleRecord.id,
      )
      if (vehicleIndex >= 0) nextState.vehicles[vehicleIndex] = vehicleRecord
      else nextState.vehicles.push(vehicleRecord)
    })

    notify(vehicle ? 'Автомобиль обновлён' : 'Автомобиль добавлен')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      extraWide
      title={vehicle ? 'Редактирование автомобиля' : 'Новый автомобиль'}
    >
      <form onSubmit={submit}>
        <div className="modal-body grid-2">
          <VehicleFields form={form} setForm={setForm} onRateTypeChange={setRateType} />
          <AutoCalcEditor form={form} setForm={setForm} catalog={state.catalog} />
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button primary type="submit">{vehicle ? 'Сохранить' : 'Добавить'}</Button>
        </div>
      </form>
    </Modal>
  )
}
