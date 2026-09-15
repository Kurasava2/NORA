import test from 'node:test'
import assert from 'node:assert/strict'
import { tripBelongsToPeriod } from '../src/lib/periodImport.js'

const may = { start:'2009-04-21', end:'2009-05-20' }

test('month import keeps only waybills inside the declared calculation period', () => {
  assert.equal(tripBelongsToPeriod({date:'2009-04-21'},may),true)
  assert.equal(tripBelongsToPeriod({date:'2009-05-20'},may),true)
  assert.equal(tripBelongsToPeriod({date:'2009-04-20'},may),false)
  assert.equal(tripBelongsToPeriod({date:'2009-05-21'},may),false)
  assert.equal(tripBelongsToPeriod({date:''},may),false)
})
