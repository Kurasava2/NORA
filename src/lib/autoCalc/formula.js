import { num } from '../numbers.js'
import { normalizeCalcCode } from './config.js'
import { BASE_VARIABLE_ALIASES } from './constants.js'
import { tokenizeFormula, toReversePolishNotation } from './formulaParser.js'

export function formulaIdentifiers(expression) {
  return [
    ...new Set(
      tokenizeFormula(expression)
        .filter(token => token.type === 'ident')
        .map(token => token.value),
    ),
  ]
}

export function validateFormulaSyntax(expression) {
  if (!String(expression || '').trim()) throw new Error('Формула пустая')

  let stackDepth = 0
  for (const token of toReversePolishNotation(tokenizeFormula(expression))) {
    if (token.type === 'number' || token.type === 'ident') {
      stackDepth += 1
      continue
    }

    const isUnaryOperator = token.type === 'op' && ['u+', 'u-'].includes(token.value)
    if (isUnaryOperator) {
      if (stackDepth < 1) throw new Error('Не хватает значения в формуле')
      continue
    }

    if (token.type === 'op') {
      if (stackDepth < 2) throw new Error('Не хватает значения в формуле')
      stackDepth -= 1
    }
  }

  if (stackDepth !== 1) throw new Error('Формула составлена некорректно')
  return true
}

function normalizeVariables(variables) {
  const normalizedVariables = {}
  for (const [variableName, variableValue] of Object.entries(variables || {})) {
    normalizedVariables[normalizeCalcCode(variableName)] = variableValue
  }
  return normalizedVariables
}

function applyBinaryOperator(operator, leftOperand, rightOperand) {
  if (operator === '+') return leftOperand + rightOperand
  if (operator === '-') return leftOperand - rightOperand
  if (operator === '*') return leftOperand * rightOperand
  if (operator === '/') {
    if (Math.abs(rightOperand) < 1e-12) throw new Error('Деление на ноль')
    return leftOperand / rightOperand
  }
  if (operator === '^') return leftOperand ** rightOperand
  throw new Error(`Неизвестный оператор «${operator}»`)
}

export function evaluateFormula(expression, variables = {}) {
  if (!String(expression || '').trim()) throw new Error('Формула пустая')

  const normalizedVariables = normalizeVariables(variables)
  const valueStack = []

  for (const token of toReversePolishNotation(tokenizeFormula(expression))) {
    if (token.type === 'number') {
      valueStack.push(token.value)
      continue
    }

    if (token.type === 'ident') {
      const canonicalName = BASE_VARIABLE_ALIASES[token.value] || token.value
      const rawValue = normalizedVariables[canonicalName] ?? normalizedVariables[token.value]
      const numericValue = num(rawValue)
      if (numericValue === null) throw new Error(`Не задан параметр «${token.value}»`)
      valueStack.push(numericValue)
      continue
    }

    if (token.type !== 'op') continue

    if (token.value === 'u+' || token.value === 'u-') {
      if (valueStack.length < 1) throw new Error('Ошибка унарного оператора')
      const operand = valueStack.pop()
      valueStack.push(token.value === 'u-' ? -operand : operand)
      continue
    }

    if (valueStack.length < 2) throw new Error('Не хватает значения в формуле')

    const rightOperand = valueStack.pop()
    const leftOperand = valueStack.pop()
    const result = applyBinaryOperator(token.value, leftOperand, rightOperand)

    if (!Number.isFinite(result)) {
      throw new Error('Результат формулы не является конечным числом')
    }

    valueStack.push(result)
  }

  if (valueStack.length !== 1) throw new Error('Формула составлена некорректно')
  return valueStack[0]
}
