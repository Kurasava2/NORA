import { num } from '../numbers.js'
import { normalizeCalcCode } from './config.js'
import { BASE_VARIABLE_ALIASES } from './constants.js'
import { tokenizeFormula, toReversePolishNotation } from './formulaParser.js'

const PERCENT_KIND = 'percentage'

function isPercentage(value) {
  return Boolean(value && typeof value === 'object' && value.kind === PERCENT_KIND)
}

function percentage(fraction) {
  return { kind: PERCENT_KIND, fraction }
}

function numericOperand(value) {
  return isPercentage(value) ? value.fraction : value
}

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

    if (token.type === 'percent') {
      if (stackDepth < 1) throw new Error('Знаку % не хватает значения')
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
  if (operator === '+' && isPercentage(rightOperand)) {
    if (isPercentage(leftOperand)) {
      return percentage(leftOperand.fraction + rightOperand.fraction)
    }
    return leftOperand + leftOperand * rightOperand.fraction
  }

  if (operator === '-' && isPercentage(rightOperand)) {
    if (isPercentage(leftOperand)) {
      return percentage(leftOperand.fraction - rightOperand.fraction)
    }
    return leftOperand - leftOperand * rightOperand.fraction
  }

  const leftValue = numericOperand(leftOperand)
  const rightValue = numericOperand(rightOperand)
  if (operator === '+') return leftValue + rightValue
  if (operator === '-') return leftValue - rightValue
  if (operator === '*') return leftValue * rightValue
  if (operator === '/') {
    if (Math.abs(rightValue) < 1e-12) throw new Error('Деление на ноль')
    return leftValue / rightValue
  }
  if (operator === '^') return leftValue ** rightValue
  throw new Error(`Неизвестный оператор «${operator}»`)
}

function applyUnaryOperator(operator, operand) {
  const multiplier = operator === 'u-' ? -1 : 1
  if (isPercentage(operand)) return percentage(operand.fraction * multiplier)
  return operand * multiplier
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

    if (token.type === 'percent') {
      if (valueStack.length < 1) throw new Error('Знаку % не хватает значения')
      valueStack.push(percentage(numericOperand(valueStack.pop()) / 100))
      continue
    }

    if (token.type !== 'op') continue

    if (token.value === 'u+' || token.value === 'u-') {
      if (valueStack.length < 1) throw new Error('Ошибка унарного оператора')
      valueStack.push(applyUnaryOperator(token.value, valueStack.pop()))
      continue
    }

    if (valueStack.length < 2) throw new Error('Не хватает значения в формуле')
    const rightOperand = valueStack.pop()
    const leftOperand = valueStack.pop()
    const result = applyBinaryOperator(token.value, leftOperand, rightOperand)

    if (!isPercentage(result) && !Number.isFinite(result)) {
      throw new Error('Результат формулы не является конечным числом')
    }
    valueStack.push(result)
  }

  if (valueStack.length !== 1) throw new Error('Формула составлена некорректно')
  const result = numericOperand(valueStack[0])
  if (!Number.isFinite(result)) throw new Error('Результат формулы не является конечным числом')
  return result
}
