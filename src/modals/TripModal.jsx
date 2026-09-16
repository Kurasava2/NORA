import React, { useEffect, useState } from 'react'
import { Modal } from '../components/ui.jsx'
import { prefilledTrip } from '../lib/domain.js'
import CalculationParametersSection from './trip/CalculationParametersSection.jsx'
import changeInsertionPosition from './trip/changeInsertionPosition.js'
import TripBasicsSections from './trip/TripBasicsSections.jsx'
import TripInsertionChoice from './trip/TripInsertionChoice.jsx'
import TripModalFooter from './trip/TripModalFooter.jsx'
import TripNoteSection from './trip/TripNoteSection.jsx'
import tripMetrics from './trip/tripMetrics.js'
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
  const [insertionPosition, setInsertionPosition] = useState('end')
  const [initialSnapshot, setInitialSnapshot] = useState('')
  const materials = useTripMaterials({
    state,
    statement,
    editingId,
    insertionPosition,
    form,
    setForm,
  })
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
    const initialForm = prefilledTrip(state, statement, period, trip, 'end')
    setInsertionPosition('end')
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
  const { mileage, workedMotohours, legacyMotohours } = tripMetrics(form, vehicle)
  const actions = useTripActions({
    form,
    initialSnapshot,
    editingId,
    insertionPosition,
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
      backdropClassName="trip-modal-backdrop"
    >
      <form onSubmit={actions.saveTrip} className="trip-modal-form">
        <div className="trip-modal-body">
          {!editingId && (
            <TripInsertionChoice
              position={insertionPosition}
              onChange={nextPosition =>
                changeInsertionPosition({
                  nextPosition,
                  insertionPosition,
                  form,
                  initialSnapshot,
                  state,
                  statement,
                  period,
                  confirmAction,
                  setInsertionPosition,
                  setForm,
                  setInitialSnapshot,
                  resetMaterialPick: materials.resetMaterialPick,
                  resetCalculationPreview: autoCalculation.resetCalculationPreview,
                  setErrors,
                })
              }
            />
          )}
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
          <TripNoteSection
            stepNumber={noteStep}
            value={form.note}
            onChange={value => setTripField('note', value)}
          />
        </div>
        <TripModalFooter editingId={editingId} actions={actions} />
      </form>
    </Modal>
  )
}
