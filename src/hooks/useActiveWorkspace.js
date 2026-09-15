import { useMemo } from 'react'
import { sortedPeriods, vehicleOf } from '../lib/domain.js'

export default function useActiveWorkspace(state, view) {
  const periods = useMemo(() => sortedPeriods(state), [state])

  const activePeriod = state.periods.find(period => period.id === view.periodId)
  const activeStatement = activePeriod?.statements?.find(
    statement => statement.id === view.statementId,
  )
  const activeVehicle = activeStatement
    ? vehicleOf(state, activeStatement.vehicleId)
    : view.vehicleId
      ? vehicleOf(state, view.vehicleId)
      : null

  return { periods, activePeriod, activeStatement, activeVehicle }
}
