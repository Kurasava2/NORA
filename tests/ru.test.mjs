import test from 'node:test'
import assert from 'node:assert/strict'
import { countRu, pluralRu } from '../src/lib/ru.js'

test('Russian plural forms cover 1/2-4/5+ and 11-14', () => {
  assert.equal(countRu(1, 'месяц', 'месяца', 'месяцев'), '1 месяц')
  assert.equal(countRu(2, 'месяц', 'месяца', 'месяцев'), '2 месяца')
  assert.equal(countRu(4, 'месяц', 'месяца', 'месяцев'), '4 месяца')
  assert.equal(countRu(5, 'месяц', 'месяца', 'месяцев'), '5 месяцев')
  assert.equal(countRu(11, 'месяц', 'месяца', 'месяцев'), '11 месяцев')
  assert.equal(countRu(14, 'месяц', 'месяца', 'месяцев'), '14 месяцев')
  assert.equal(countRu(21, 'месяц', 'месяца', 'месяцев'), '21 месяц')
  assert.equal(countRu(22, 'месяц', 'месяца', 'месяцев'), '22 месяца')
  assert.equal(countRu(25, 'месяц', 'месяца', 'месяцев'), '25 месяцев')
})

test('Plural helper can return whole phrases', () => {
  assert.equal(pluralRu(1, 'машина готова', 'машины готовы', 'машин готово'), 'машина готова')
  assert.equal(pluralRu(3, 'машина готова', 'машины готовы', 'машин готово'), 'машины готовы')
  assert.equal(pluralRu(12, 'машина готова', 'машины готовы', 'машин готово'), 'машин готово')
})
