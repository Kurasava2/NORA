import { countForm, RU_FORMS } from '../ru.js'
import { validateStatement } from './statementValidation.js'

export function statementStatus(state, statement, period) {

  const validation = validateStatement(state, statement, period)

  if (!statement.trips?.length) {
    return { key: 'idle', label: 'Не ездила', tone: 'ok', check: validation }
  }
  if (validation.errors.length) {
    return {
      key: 'bad',
      label: countForm(validation.errors.length, RU_FORMS.error),
      tone: 'bad',
      check: validation,
    }
  }
  if (validation.warnings.length) {
    return {
      key: 'warn',
      label: countForm(validation.warnings.length, RU_FORMS.warning),
      tone: 'warn',
      check: validation,
    }
  }

  return { key: 'ok', label: 'Готово', tone: 'ok', check: validation }
}
