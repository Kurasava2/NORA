import { useCallback } from 'react'
import { periodDisplayName, periodYear } from '../lib/domain.js'
import { countForm, RU_FORMS } from '../lib/ru.js'

export default function usePeriodDeleteActions({ state, mutate, confirmAction, goHome }) {
  const deletePeriod = useCallback(
    async periodId => {
      const period = state.periods.find(candidatePeriod => candidatePeriod.id === periodId)
      if (!period) return

      const shouldDelete = await confirmAction({
        title: 'Удалить период?',
        message: `${periodDisplayName(period)} и все его ведомости будут удалены.`,
        confirmText: 'Удалить период',
        danger: true,
      })
      if (!shouldDelete) return

      mutate(nextState => {
        nextState.periods = nextState.periods.filter(
          candidatePeriod => candidatePeriod.id !== periodId,
        )
      })
      goHome()
    },
    [state, mutate, confirmAction, goHome],
  )

  const deleteYear = useCallback(
    async year => {
      const periodCount = state.periods.filter(
        period => periodYear(period) === Number(year),
      ).length
      const shouldDelete = await confirmAction({
        title: `Удалить ${year} год?`,
        message: `Будут удалены ${countForm(periodCount, RU_FORMS.period)} этого года.`,
        confirmText: 'Удалить год',
        danger: true,
      })
      if (!shouldDelete) return

      mutate(nextState => {
        nextState.periods = nextState.periods.filter(period => periodYear(period) !== Number(year))
      })
      goHome()
    },
    [state, mutate, confirmAction, goHome],
  )

  return { deletePeriod, deleteYear }
}
