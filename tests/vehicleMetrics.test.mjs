import test from 'node:test'
import assert from 'node:assert/strict'
import { RATE_PER_100KM, RATE_PER_MOTOHOUR, motohoursWorked, normalizeRateType, rateUnitLabel, usesMotohourRate } from '../src/lib/vehicleMetrics.js'

test('rate type defaults to l/100 km',()=>{
  assert.equal(normalizeRateType(undefined),RATE_PER_100KM)
  assert.equal(rateUnitLabel({}), 'л/100 км')
  assert.equal(usesMotohourRate({}), false)
})

test('motohour rate uses l/motohour',()=>{
  const v={rateType:RATE_PER_MOTOHOUR}
  assert.equal(rateUnitLabel(v),'л/моточас')
  assert.equal(usesMotohourRate(v),true)
})

test('motohours worked is calculated from counter readings',()=>{
  assert.equal(motohoursWorked({motohoursStart:'125,5',motohoursEnd:'132,75'}),7.25)
})

test('legacy single motohours value remains readable',()=>{
  assert.equal(motohoursWorked({motohours:8.5}),8.5)
})
