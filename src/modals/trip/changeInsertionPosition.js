import { prefilledTrip } from '../../lib/domain.js'

export default async function changeInsertionPosition({
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
  resetMaterialPick,
  resetCalculationPreview,
  setErrors,
}) {
  if (nextPosition === insertionPosition) return
  const hasEnteredData = initialSnapshot && JSON.stringify(form) !== initialSnapshot
  if (hasEnteredData) {
    const shouldReset = await confirmAction({
      title: 'Сменить позицию путёвки?',
      message: 'Введённые данные будут очищены, и заполнение начнётся заново.',
      confirmText: 'Сменить позицию',
      danger: true,
    })
    if (!shouldReset) return
  }

  const nextForm = prefilledTrip(state, statement, period, null, nextPosition)
  setInsertionPosition(nextPosition)
  setForm(nextForm)
  setInitialSnapshot(JSON.stringify(nextForm))
  resetMaterialPick()
  resetCalculationPreview()
  setErrors([])
}
