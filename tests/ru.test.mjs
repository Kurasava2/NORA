import test from 'node:test'
import assert from 'node:assert/strict'
import { countRu, pluralRu } from '../src/lib/ru.js'

test('Russian plural endings handle 1/2-4/5 and 11-14', () => {
  assert.equal(pluralRu(1,'месяц','месяца','месяцев'),'месяц')
  assert.equal(pluralRu(2,'месяц','месяца','месяцев'),'месяца')
  assert.equal(pluralRu(5,'месяц','месяца','месяцев'),'месяцев')
  assert.equal(pluralRu(11,'месяц','месяца','месяцев'),'месяцев')
  assert.equal(pluralRu(21,'месяц','месяца','месяцев'),'месяц')
  assert.equal(pluralRu(22,'месяц','месяца','месяцев'),'месяца')
  assert.equal(pluralRu(25,'месяц','месяца','месяцев'),'месяцев')
})

test('countRu includes the number', () => {
  assert.equal(countRu(3,'машина','машины','машин'),'3 машины')
})
