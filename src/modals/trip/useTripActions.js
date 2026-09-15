import { clone, num, reconcileCarryForward, sortTrips } from '../../lib/domain.js'
import { tripFormErrors } from './tripFormValidation.js'

export default function useTripActions({
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
        nextStatement.trips.push(tripRecord)
      }

      sortTrips(nextStatement)
      reconcileCarryForward(nextState, nextStatement)
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
    })

    notify('Путёвка удалена')
    onClose()
  }

  return { requestClose, saveTrip, deleteTrip }
}
