import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateVehicleConsumption } from '../src/lib/autoCalc.js'

test('legacy inputs and parameters cannot override built-in calculation variables', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 92,
    autoCalc: {
      enabled: true,
      params: [
        { id: 'old-km', code: 'КМ', label: 'Старый КМ', defaultValue: 999 },
        { id: 'old-rate', code: 'НОРМА', label: 'Старая норма', defaultValue: 1 },
        { id: 'old-hours', code: 'MOTOHOURS', label: 'Старые моточасы', defaultValue: 777 },
        { id: 'factor', code: 'КОЭФ', label: 'Коэффициент', defaultValue: 1 },
      ],
      rules: [
        {
          id: 'fuel',
          name: 'Топливо',
          code: 'ТОПЛИВО',
          formula: '(КМ / 100) * НОРМА + КОЭФ',
          materials: [],
          allocation: 'none',
          rounding: 0.01,
        },
      ],
    },
  }
  const trip = {
    odoStart: 1000,
    odoEnd: 1070,
    motohoursStart: 10,
    motohoursEnd: 15,
    calcInputs: {
      КМ: 999,
      ПРОБЕГ: 555,
      НОРМА: 1,
      МЧ: 999,
      КОЭФ: 2,
    },
    gsm: {},
  }

  const result = calculateVehicleConsumption(vehicle, trip, [])

  assert.equal(result.ok, true)
  assert.equal(result.inputVariables.КМ, 70)
  assert.equal(result.inputVariables.НОРМА, 92)
  assert.equal(result.inputVariables.МОТОЧАСЫ, 5)
  assert.equal(result.inputVariables.КОЭФ, 2)
  assert.equal(result.inputVariables.ПРОБЕГ, undefined)
  assert.equal(result.rules[0].value, 66.4)
})

test('legacy rule with a reserved result code cannot mutate mileage', () => {
  const vehicle = {
    id: 'v1',
    baseRate: 92,
    autoCalc: {
      enabled: true,
      params: [],
      rules: [
        {
          id: 'bad',
          name: 'Старое правило',
          code: 'КМ',
          formula: '999',
          materials: [],
          allocation: 'none',
          rounding: 0.01,
        },
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

  assert.equal(result.ok, false)
  assert.match(result.errors.join(' '), /зарезервирован/)
  assert.equal(result.variables.КМ, 70)
  assert.equal(result.rules.length, 1)
  assert.equal(result.rules[0].code, 'ТОПЛИВО')
  assert.equal(result.rules[0].value, 64.4)
})
