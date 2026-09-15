import { cellText, elems } from './xml.js'
import { setCell } from './worksheetCells.js'

export function replaceNativeSheetLabels(
  document,
  sharedStringValues,
  model,
) {
  for (const cell of elems(document, 'c')) {
    const text = cellText(cell, sharedStringValues)
    const lowerText = text.toLowerCase()

    if (/^ДТ(?=\s|$)/i.test(text)) {
      setCell(cell, text.replace(/^ДТ(?=\s|$)/i, 'Дт'))
    }

    const containsBrokenReference =
      text.includes('#REF!') ||
      elems(cell, 'f').some(formula =>
        (formula.textContent || '').includes('#REF!'),
      )
    if (containsBrokenReference) {
      setCell(cell, '')
      continue
    }

    if (
      lowerText.includes('командир автомобильной роты') &&
      model.signTitle
    ) {
      setCell(cell, model.signTitle)
    } else if (
      lowerText.trim() === 'капитан' &&
      model.signLine?.rank
    ) {
      setCell(cell, model.signLine.rank)
    } else if (
      text.includes('А. Геращенко') &&
      model.signLine?.commander
    ) {
      setCell(cell, model.signLine.commander)
    } else if (
      lowerText.includes('данные указанные в расчетной ведомости') &&
      lowerText.includes('подтверждаю')
    ) {
      setCell(
        cell,
        `Данные указанные в расчетной ведомости по пробегу и расходу горючего ${model.vehicleModel} №${model.vehicleNo} подтверждаю.`,
      )
    }
  }
}
