import { clone } from '../domain/defaults.js'
import {
  refreshCarryPathToStatement,
  refreshPeriodCarry,
} from '../domain/autoCarry.js'

export function freshStatementContext(state, periodId, statementId) {
  const nextState = clone(state)
  const period = nextState.periods.find(item => item.id === periodId)
  const statement = period?.statements?.find(item => item.id === statementId)
  if (!period || !statement) return null

  refreshCarryPathToStatement(nextState, period, statement)
  return { state: nextState, period, statement }
}

export function freshPeriodContext(state, periodId) {
  const nextState = clone(state)
  const period = nextState.periods.find(item => item.id === periodId)
  if (!period) return null

  refreshPeriodCarry(nextState, period)
  return { state: nextState, period }
}
