import { useCallback, useEffect, useMemo } from 'react'
import {
  refreshCarryPathToStatement,
  statementCarryPathIsCurrent,
} from '../../lib/domain.js'

export default function useStatementCarry({ state, period, statement, mutate, notify }) {
  const carryIsCurrent = useMemo(
    () => statementCarryPathIsCurrent(state, period, statement),
    [state, period, statement],
  )

  useEffect(() => {
    if (carryIsCurrent) return

    mutate(nextState => {
      const nextPeriod = nextState.periods.find(item => item.id === period.id)
      const nextStatement = nextPeriod?.statements?.find(item => item.id === statement.id)
      refreshCarryPathToStatement(nextState, nextPeriod, nextStatement)
    })
  }, [carryIsCurrent, mutate, period.id, statement.id])

  return useCallback(() => {
    let updatedStatements = 0
    mutate(nextState => {
      const nextPeriod = nextState.periods.find(item => item.id === period.id)
      const nextStatement = nextPeriod?.statements?.find(item => item.id === statement.id)
      updatedStatements = refreshCarryPathToStatement(nextState, nextPeriod, nextStatement)
    })
    notify(
      updatedStatements
        ? `Перенос обновлён · ведомостей в цепочке: ${updatedStatements}`
        : 'Перенос уже актуален',
    )
  }, [mutate, notify, period.id, statement.id])
}
