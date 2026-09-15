function normalizeInput(value) {
  const text = String(value ?? '').trim().replace(',', '.').replace(/\s/g, '')
  if (!text) return null
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) return null
  return text
}

function partsOf(value) {
  const text = normalizeInput(value)
  if (text === null) return null
  const negative = text.startsWith('-')
  const unsigned = text.replace(/^[+-]/, '')
  const [integerPart = '0', fractionPart = ''] = unsigned.split('.')
  const digits = `${integerPart || '0'}${fractionPart}`.replace(/^0+(?=\d)/, '') || '0'
  return {
    integer: BigInt(`${negative ? '-' : ''}${digits}`),
    scale: fractionPart.length,
  }
}

function power10(scale) {
  return 10n ** BigInt(scale)
}

function scaledPair(leftValue, rightValue) {
  const left = partsOf(leftValue)
  const right = partsOf(rightValue)
  if (!left || !right) return null
  const scale = Math.max(left.scale, right.scale)
  return {
    left: left.integer * power10(scale - left.scale),
    right: right.integer * power10(scale - right.scale),
    scale,
  }
}

function formatScaled(integer, scale) {
  const negative = integer < 0n
  const absoluteText = (negative ? -integer : integer).toString().padStart(scale + 1, '0')
  if (!scale) return `${negative ? '-' : ''}${absoluteText}`
  const integerText = absoluteText.slice(0, -scale) || '0'
  const fractionText = absoluteText.slice(-scale).replace(/0+$/, '')
  const sign = negative ? '-' : ''
  return fractionText ? `${sign}${integerText}.${fractionText}` : `${sign}${integerText}`
}

export function decimalCanonical(value, fallback = null) {
  const parts = partsOf(value)
  return parts ? formatScaled(parts.integer, parts.scale) : fallback
}

export function decimalAdd(leftValue, rightValue) {
  const pair = scaledPair(leftValue, rightValue)
  return pair ? formatScaled(pair.left + pair.right, pair.scale) : null
}

export function decimalSubtract(leftValue, rightValue) {
  const pair = scaledPair(leftValue, rightValue)
  return pair ? formatScaled(pair.left - pair.right, pair.scale) : null
}

export function decimalMultiply(leftValue, rightValue) {
  const left = partsOf(leftValue)
  const right = partsOf(rightValue)
  if (!left || !right) return null
  return formatScaled(left.integer * right.integer, left.scale + right.scale)
}

export function decimalCompare(leftValue, rightValue) {
  const pair = scaledPair(leftValue, rightValue)
  if (!pair) return null
  return pair.left === pair.right ? 0 : pair.left > pair.right ? 1 : -1
}

export function decimalSum(values) {
  return (values || []).reduce(
    (sum, value) => decimalAdd(sum, decimalCanonical(value, '0')),
    '0',
  )
}

export function decimalNumber(value) {
  const canonical = decimalCanonical(value)
  return canonical === null ? null : Number(canonical)
}
