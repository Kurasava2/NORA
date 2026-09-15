import React, { useEffect, useState } from 'react'
import { Button, Modal } from '../components/ui.jsx'
import { motohoursWorked, num, prefilledTrip } from '../lib/domain.js'
import CalculationParametersSection from './trip/CalculationParametersSection.jsx'
import SectionStep from './trip/SectionStep.jsx'
import TripBasicsSections from './trip/TripBasicsSections.jsx'
import TripMaterialsSection from './trip/TripMaterialsSection.jsx'
import useTripActions from './trip/useTripActions.js'
import useTripAutoCalculation from './trip/useTripAutoCalculation.js'
import useTripMaterials from './trip/useTripMaterials.js'

export default function TripModal({
  open,
  trip,
  onClose,
  state,
  period,
  statement,
  vehicle,
  mutate,
  notify,
  confirmAction,
}) {
  const editingId = trip?.id || null
  const [form, setForm] = useState(() => prefilledTrip(state, statement, period, trip))
  const [errors, setErrors] = useState([])
  const [initialSnapshot, setInitialSnapshot] = useState('')

  const materials = useTripMaterials({ state, statement, editingId, form, setForm })
  const autoCalculation = useTripAutoCalculation({
    state,
    statement,
    vehicle,
    editingId,
    form,
    setForm,
    notify,
  })

  useEffect(() => {
    if (!open) return
    const initialForm = prefilledTrip(state, statement, period, trip)
    setForm(initialForm)
    setInitialSnapshot(JSON.stringify(initialForm))
    materials.resetMaterialPick()
    autoCalculation.resetCalculationPreview()
    setErrors([])
  }, [open, editingId])

  useEffect(() => {
    if (!open) return
    const handleKeyboardShortcut = keyboardEvent => {
      if (keyboardEvent.ctrlKey && keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault()
        document.getElementById('trip-submit')?.click()
      }
    }
    window.addEventListener('keydown', handleKeyboardShortcut)
    return () => window.removeEventListener('keydown', handleKeyboardShortcut)
  }, [open])

  const setTripField = (fieldName, value) => {
    setForm(previousForm => ({ ...previousForm, [fieldName]: value }))
  }

  const odometerStart = num(form.odoStart)
  const odometerEnd = num(form.odoEnd)
  const mileage =
    odometerStart !== null && odometerEnd !== null ? odometerEnd - odometerStart : null
  const motohoursStart = num(form.motohoursStart)
  const motohoursEnd = num(form.motohoursEnd)
  const workedMotohours = motohoursWorked(form)
  const legacyMotohours =
    vehicle.hasMotohours &&
    motohoursStart === null &&
    motohoursEnd === null &&
    num(form.motohours) !== null

  const actions = useTripActions({
    form,
    initialSnapshot,
    editingId,
    trip,
    state,
    period,
    statement,
    vehicle,
    mutate,
    notify,
    confirmAction,
    onClose,
    setErrors,
  })

  const materialsStep = autoCalculation.calculationParameters.length ? 4 : 3
  const noteStep = materialsStep + 1

  return (
    <Modal
      open={open}
      onClose={actions.requestClose}
      extraWide
      title={editingId ? `Путёвка №${trip?.number || '—'}` : 'Новая путёвка'}
      subtitle={`${vehicle.model} · ${vehicle.shortNo}`}
    >
      <form onSubmit={actions.saveTrip} className="trip-modal-form">
        <div className="trip-modal-body">
          {errors.length > 0 && (
            <div className="form-errors">
              <b>Путёвку нельзя сохранить:</b>
              {errors.map((errorMessage, errorIndex) => (
                <div key={errorIndex}>• {errorMessage}</div>
              ))}
            </div>
          )}

          <TripBasicsSections
            form={form}
            setForm={setForm}
            setTripField={setTripField}
            period={period}
            vehicle={vehicle}
            mileage={mileage}
            motohoursWorked={workedMotohours}
            legacyMotohours={legacyMotohours}
          />

          <CalculationParametersSection
            parameters={autoCalculation.calculationParameters}
            form={form}
            onChange={autoCalculation.setCalculationInput}
          />

          <TripMaterialsSection
            stepNumber={materialsStep}
            state={state}
            form={form}
            materials={materials}
            autoCalculation={autoCalculation}
          />

          <SectionStep number={String(noteStep)} title="Примечание" subtitle="необязательно">
            <textarea
              className="textarea"
              value={form.note || ''}
              onChange={event => setTripField('note', event.target.value)}
            />
          </SectionStep>
        </div>

        <div className="modal-actions sticky-actions">
          {editingId ? (
            <Button type="button" danger onClick={actions.deleteTrip}>Удалить</Button>
          ) : (
            <span />
          )}
          <div className="action-cluster">
            <span className="shortcut">Ctrl + Enter</span>
            <Button type="button" onClick={actions.requestClose}>Отмена</Button>
            <Button id="trip-submit" primary type="submit">
              {editingId ? 'Сохранить изменения' : 'Сохранить путёвку'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
