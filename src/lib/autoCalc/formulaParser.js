import { normalizeCalcCode } from './config.js'

const OPERATOR_PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  'u+': 3,
  'u-': 3,
  '^': 4,
}

const RIGHT_ASSOCIATIVE_OPERATORS = new Set(['^', 'u+', 'u-'])

function normalizeMathSymbols(expression) {
  return String(expression || '')
    .replace(/,/g, '.')
    .replace(/[×·∙]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/[−–—]/g, '-')
}

export function tokenizeFormula(expression) {
  const expressionText = normalizeMathSymbols(expression)
  const tokens = []
  let cursor = 0

  while (cursor < expressionText.length) {
    const character = expressionText[cursor]

    if (/\s/.test(character)) {
      cursor += 1
      continue
    }

    if (/[0-9.]/.test(character)) {
      let numberEnd = cursor + 1
      while (numberEnd < expressionText.length && /[0-9.]/.test(expressionText[numberEnd])) {
        numberEnd += 1
      }

      const numberText = expressionText.slice(cursor, numberEnd)
      const isValidNumber = /^\d+(?:\.\d+)?$/.test(numberText) || /^\.\d+$/.test(numberText)
      if (!isValidNumber) throw new Error(`Некорректное число «${numberText}»`)

      tokens.push({ type: 'number', value: Number(numberText) })
      cursor = numberEnd
      continue
    }

    if (/[A-Za-zА-Яа-яЁё_]/.test(character)) {
      let identifierEnd = cursor + 1
      while (
        identifierEnd < expressionText.length &&
        /[A-Za-zА-Яа-яЁё0-9_]/.test(expressionText[identifierEnd])
      ) {
        identifierEnd += 1
      }

      tokens.push({
        type: 'ident',
        value: normalizeCalcCode(expressionText.slice(cursor, identifierEnd)),
      })
      cursor = identifierEnd
      continue
    }

    if (character === '%') {
      tokens.push({ type: 'percent', value: '%' })
      cursor += 1
      continue
    }

    if ('+-*/^()'.includes(character)) {
      tokens.push({
        type: character === '(' ? 'lparen' : character === ')' ? 'rparen' : 'op',
        value: character,
      })
      cursor += 1
      continue
    }

    throw new Error(`Недопустимый символ «${character}»`)
  }

  return tokens
}

export function toReversePolishNotation(tokens) {
  const output = []
  const operatorStack = []
  let previousTokenType = 'start'

  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'ident') {
      output.push(token)
      previousTokenType = 'value'
      continue
    }

    if (token.type === 'percent') {
      if (previousTokenType !== 'value') throw new Error('Знак % должен стоять после значения')
      output.push(token)
      previousTokenType = 'value'
      continue
    }

    if (token.type === 'lparen') {
      operatorStack.push(token)
      previousTokenType = 'lparen'
      continue
    }

    if (token.type === 'rparen') {
      while (operatorStack.length && operatorStack.at(-1).type !== 'lparen') {
        output.push(operatorStack.pop())
      }
      if (!operatorStack.length) throw new Error('Лишняя закрывающая скобка')
      operatorStack.pop()
      previousTokenType = 'value'
      continue
    }

    if (token.type !== 'op') continue

    let operator = token.value
    const isUnaryPosition = ['start', 'op', 'lparen'].includes(previousTokenType)
    if ((operator === '+' || operator === '-') && isUnaryPosition) operator = `u${operator}`
    const isUnaryOperator = operator === 'u+' || operator === 'u-'

    while (!isUnaryOperator && operatorStack.length && operatorStack.at(-1).type === 'op') {
      const topOperator = operatorStack.at(-1).value
      const shouldPop = RIGHT_ASSOCIATIVE_OPERATORS.has(operator)
        ? OPERATOR_PRECEDENCE[operator] < OPERATOR_PRECEDENCE[topOperator]
        : OPERATOR_PRECEDENCE[operator] <= OPERATOR_PRECEDENCE[topOperator]

      if (!shouldPop) break
      output.push(operatorStack.pop())
    }

    operatorStack.push({ type: 'op', value: operator })
    previousTokenType = 'op'
  }

  while (operatorStack.length) {
    const operator = operatorStack.pop()
    if (operator.type === 'lparen') throw new Error('Не закрыта скобка')
    output.push(operator)
  }

  return output
}
