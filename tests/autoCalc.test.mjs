import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLOC_MINIMIZE,
  ALLOC_PRIORITY,
  allocateConsumption,
  calculateVehicleConsumption,
  defaultAutoCalcForVehicle,
  evaluateFormula,
  validateFormulaSyntax,
} from '../src/lib/autoCalc.js'

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

test('вычислитель соблюдает обычный приоритет операций и кириллические переменные', () => {
  assert.equal(
    evaluateFormula('КМ * НОРМА / 100 + РЕЙСЫ * 4', { КМ: 500, НОРМА: 59, РЕЙСЫ: 2 }),
    303,
  )
  assert.equal(evaluateFormula('-(КМ - 10) / 2', { КМ: 20 }), -5)
  assert.throws(() => evaluateFormula('КМ / 0', { КМ: 1 }), /Деление на ноль/)
})

test('формулы из путёвки используют именно разницу показаний одометра', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 92,
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        {
          id: 'fuel',
          name: 'Топливо',
          code: 'ТОПЛИВО',
          formula: '(КМ / 100) * НОРМА',
          materials: [],
          allocation: 'none',
          rounding: 0.01,
        },
      ],
    },
  }
  const result = calculateVehicleConsumption(
    vehicle,
    { odoStart: 1000, odoEnd: 1070, gsm: {} },
    [],
  )

  assert.equal(result.ok, true)
  assert.equal(result.inputVariables.КМ, 70)
  assert.equal(result.inputVariables.НОРМА, 92)
  assert.equal(result.rules[0].value, 64.4)
  assert.equal(evaluateFormula('КМ / 100', { КМ: 70 }), 0.7)
})

test('проценты работают как на обычном калькуляторе для надбавок', () => {
  assert.equal(evaluateFormula('30 + 35%'), 40.5)
  assert.equal(evaluateFormula('100 - 15%'), 85)
  assert.equal(evaluateFormula('200 * 35%'), 70)
  closeTo(evaluateFormula('20% + 10%'), 0.3)
  closeTo(
    evaluateFormula('(КМ / 100) * НОРМА + 35%', { КМ: 70, НОРМА: 92 }),
    86.94,
  )
})

test('поддерживаются привычные математические символы и стандартная степень', () => {
  closeTo(evaluateFormula('70 ÷ 100 × 92'), 64.4)
  closeTo(evaluateFormula('70 : 100 · 92'), 64.4)
  assert.equal(evaluateFormula('-2^2'), -4)
  assert.equal(evaluateFormula('2^-2'), 0.25)
})

test('проверка синтаксиса ловит незаконченные выражения', () => {
  assert.equal(validateFormulaSyntax('(КМ + 2) * НОРМА + 35%'), true)
  assert.throws(() => validateFormulaSyntax('КМ *'), /Не хватает значения|некорректно/)
  assert.throws(() => validateFormulaSyntax('(КМ + 2'), /скобк/)
  assert.throws(() => validateFormulaSyntax('% 35'), /%/)
})

test('минимизация остатков полностью списывает меньший вид топлива', () => {
  const result = allocateConsumption(
    450,
    ['ДТ "А"', 'ДТ "З"'],
    {
      'ДТ "А"': { start: 200, received: 0 },
      'ДТ "З"': { start: 500, received: 0 },
    },
    ALLOC_MINIMIZE,
    [],
    0.01,
  )
  const allocations = Object.fromEntries(
    result.allocations.map(allocation => [allocation.material, allocation]),
  )
  assert.equal(allocations['ДТ "А"'].spent, 200)
  assert.equal(allocations['ДТ "А"'].end, 0)
  assert.equal(allocations['ДТ "З"'].spent, 250)
  assert.equal(allocations['ДТ "З"'].end, 250)
  assert.equal(result.shortage, 0)
})

test('приоритетное списание следует заданному порядку', () => {
  const result = allocateConsumption(
    250,
    ['А', 'З'],
    { А: { start: 200 }, З: { start: 500 } },
    ALLOC_PRIORITY,
    ['З', 'А'],
    0.01,
  )
  const allocations = Object.fromEntries(
    result.allocations.map(allocation => [allocation.material, allocation]),
  )
  assert.equal(allocations.З.spent, 250)
  assert.equal(allocations.З.end, 250)
  assert.equal(allocations.А.spent, 0)
})

test('ручной расход сохраняется, а AUTO распределяет только остаток расчётного значения', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 100,
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        {
          id: 'fuel',
          name: 'Топливо',
          code: 'ТОПЛИВО',
          formula: 'НОРМА',
          materials: ['А', 'З'],
          allocation: 'minimize',
          rounding: 0.01,
        },
      ],
    },
  }
  const trip = {
    odoStart: 0,
    odoEnd: 1,
    gsm: {
      А: { start: 50, spent: 20, end: 30, _calcSource: 'manual' },
      З: { start: 100 },
    },
  }
  const result = calculateVehicleConsumption(vehicle, trip, [])
  const allocations = Object.fromEntries(
    result.rules[0].allocations.map(allocation => [allocation.material, allocation]),
  )

  assert.equal(allocations.А.locked, true)
  assert.equal(allocations.А.spent, 20)
  assert.equal(allocations.З.spent, 80)
  assert.equal(allocations.З.end, 20)
})

test('правила могут зависеть от результатов предыдущих правил', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 50,
    rateType: 'per100km',
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        {
          id: 'fuel',
          name: 'Топливо',
          code: 'ТОПЛИВО',
          formula: '(КМ / 100) * НОРМА',
          materials: ['ДТ "З"'],
          allocation: 'minimize',
          rounding: 0.01,
        },
        {
          id: 'oil',
          name: 'Масло',
          code: 'МАСЛО',
          formula: 'ТОПЛИВО * 2.4%',
          materials: ['Масло "Р"'],
          allocation: 'minimize',
          rounding: 0.01,
        },
      ],
    },
  }
  const trip = {
    odoStart: 1000,
    odoEnd: 1500,
    gsm: {
      'ДТ "З"': { start: 400, received: 0 },
      'Масло "Р"': { start: 20, received: 0 },
    },
  }
  const result = calculateVehicleConsumption(vehicle, trip, [])
  assert.equal(result.ok, true)
  assert.equal(result.rules[0].value, 250)
  assert.equal(result.rules[1].value, 6)
  assert.equal(result.rules[0].allocations[0].end, 150)
  assert.equal(result.rules[1].allocations[0].end, 14)
})

test('ошибка правила не оставляет ложное состояние циклической зависимости', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 1,
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        { id: 'a', name: 'A', code: 'A', formula: 'НЕТ + 1', materials: [], allocation: 'none' },
        { id: 'b', name: 'B', code: 'B', formula: 'A + 1', materials: [], allocation: 'none' },
      ],
    },
  }
  const result = calculateVehicleConsumption(vehicle, { odoStart: 0, odoEnd: 1, gsm: {} }, [])
  assert.equal(result.ok, false)
  assert.doesNotMatch(result.errors.join(' '), /Циклическая зависимость/)
})

test('настоящая циклическая зависимость правил отклоняется', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 1,
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        { id: 'a', name: 'A', code: 'A', formula: 'B + 1', materials: [], allocation: 'none' },
        { id: 'b', name: 'B', code: 'B', formula: 'A + 1', materials: [], allocation: 'none' },
      ],
    },
  }
  const result = calculateVehicleConsumption(vehicle, { odoStart: 0, odoEnd: 1, gsm: {} }, [])
  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /Циклическая зависимость/)
})

test('базовое правило строится из нормы машины', () => {
  const vehicle = {
    id: '2283',
    baseRate: 59,
    rateType: 'per100km',
    defaultMaterials: ['ДТ "З"'],
  }
  const config = defaultAutoCalcForVehicle(vehicle, [
    { name: 'ДТ "З"', category: 'Топливо', sourceVehicles: ['2283'] },
  ])
  assert.equal(config.rules[0].formula, '(КМ / 100) * НОРМА')
  assert.deepEqual(config.rules[0].materials, ['ДТ "З"'])
})
