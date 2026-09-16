import {
  clone,
  num,
  reconcileCarryForward,
  sortTrips,
  syncFutureVehicleCarry,
} from '../../lib/domain.js'
import { insertionListOrder } from '../../lib/trips.js'
import { tripFormErrors } from './tripFormValidation.js'

export default function useTripActions({
  form,
  initialSnapshot,
  editingId,
  insertionPosition = 'end',
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
}) {
  const requestClose = async () => {
    const hasUnsavedChanges = initialSnapshot && JSON.stringify(form) !== initialSnapshot
    if (hasUnsavedChanges) {
      const shouldDiscard = await confirmAction({
        title: 'Отменить изменения?',
        message: 'Несохранённые изменения путёвки будут потеряны.',
        confirmText: 'Отменить изменения',
        danger: true,
      })
      if (!shouldDiscard) return
    }
    onClose()
  }

  const saveTrip = submitEvent => {
    submitEvent.preventDefault()
    const tripRecord = clone(form)
    tripRecord.number = String(tripRecord.number || '').trim()
    tripRecord.note = String(tripRecord.note || '').trim()

    if (num(tripRecord.motohoursStart) !== null && num(tripRecord.motohoursEnd) !== null) {
      tripRecord.motohours = ''
    }

    const errors = tripFormErrors({
      form: tripRecord,
      period,
      statement,
      vehicle,
      state,
      editingId,
      insertionPosition,
    })
    if (errors.length) {
      setErrors(errors)
      return
    }

    tripRecord.id = editingId || tripRecord.id || Date.now().toString(36)
    tripRecord.seq = editingId
      ? statement.trips.find(candidateTrip => candidateTrip.id === editingId)?.seq || Date.now()
      : tripRecord.seq || Date.now() + Math.random()

    mutate(nextState => {
      const nextPeriod = nextState.periods.find(candidatePeriod => candidatePeriod.id === period.id)
      const nextStatement = nextPeriod.statements.find(
        candidateStatement => candidateStatement.id === statement.id,
      )

      if (editingId) {
        const tripIndex = nextStatement.trips.findIndex(
          candidateTrip => candidateTrip.id === editingId,
        )
        if (tripIndex >= 0) nextStatement.trips[tripIndex] = tripRecord
      } else {
        tripRecord.listOrder = insertionListOrder(nextStatement.trips, insertionPosition)
        nextStatement.trips.push(tripRecord)
      }

      sortTrips(nextStatement)
      if (!editingId && insertionPosition === 'start') {
        syncFollowingTripStart(nextStatement, tripRecord.id, vehicle)
      }
      reconcileCarryForward(nextState, nextStatement)
      syncFutureVehicleCarry(nextState, nextStatement.vehicleId, nextPeriod)
    })

    notify(editingId ? 'Путёвка обновлена' : 'Путёвка добавлена')
    onClose()
  }

  const deleteTrip = async () => {
    if (!editingId) return

    const shouldDelete = await confirmAction({
      title: 'Удалить путёвку?',
      message: `Путёвка №${trip?.number || '—'} будет удалена.`,
      confirmText: 'Удалить',
      danger: true,
    })
    if (!shouldDelete) return

    mutate(nextState => {
      const nextPeriod = nextState.periods.find(candidatePeriod => candidatePeriod.id === period.id)
      const nextStatement = nextPeriod.statements.find(
        candidateStatement => candidateStatement.id === statement.id,
      )
      nextStatement.trips = nextStatement.trips.filter(
        candidateTrip => candidateTrip.id !== editingId,
      )
      reconcileCarryForward(nextState, nextStatement)
      syncFutureVehicleCarry(nextState, nextStatement.vehicleId, nextPeriod)
    })

    notify('Путёвка удалена')
    onClose()
  }

  return { requestClose, saveTrip, deleteTrip }
}

function syncFollowingTripStart(statement, insertedTripId, vehicle) {
  const insertedIndex = statement.trips.findIndex(item => item.id === insertedTripId)
  const insertedTrip = statement.trips[insertedIndex]
  const followingTrip = statement.trips[insertedIndex + 1]
  if (!insertedTrip || !followingTrip) return

  const odometerEnd = num(insertedTrip.odoEnd)
  if (odometerEnd !== null) followingTrip.odoStart = odometerEnd

  if (vehicle?.hasMotohours) {
    const motohoursEnd = num(insertedTrip.motohoursEnd)
    if (motohoursEnd !== null) followingTrip.motohoursStart = motohoursEnd
  }
}
