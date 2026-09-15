export function classNames(...classValues) {
  return classValues.flat().filter(Boolean).join(' ')
}
