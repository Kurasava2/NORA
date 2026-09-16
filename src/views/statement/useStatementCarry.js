import { useCallback, useEffect, useMemo } from 'react'
import { refreshStatementOpening, statementOpeningIsCurrent } from '../../lib/domain.js'

export default function useStatementCarry({ state, period, statement, mutate, notify }) {
  const openingIsCurrent = useMemo(
    () => statementOpeningIsCurrent(state, period, statement),
    [state, period, statement],
  )

  useEffect(() => {
    if (openingIsCurrent) return

    mutate(nextState => {
      const nextPeriod = nextState.periods.find(item => item.id === period.id)
      const nextStatement = nextPeriod?.statements?.find(item => item.id === statement.id)
      refreshStatementOpening(nextState, nextPeriod, nextStatement)
    })
  }, [openingIsCurrent, mutate, period.id, statement.id])

  return useCallback(() => {
    let changed = false
    mutate(nextState => {
      const nextPeriod = nextState.periods.find(item => item.id === period.id)
      const nextStatement = nextPeriod?.statements?.find(item => item.id === statement.id)
      changed = refreshStatementOpening(nextState, nextPeriod, nextStatement)
    })
    notify(changed ? 'Перенос обновлён' : 'Перенос уже актуален')
  }, [mutate, notify, period.id, statement.id])
}
