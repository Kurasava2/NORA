import test from 'node:test'
import assert from 'node:assert/strict'
import { basicTripErrors } from '../src/lib/tripValidation.js'

const base={date:'2026-09-01',number:'1',odoStart:100,odoEnd:110,gsm:{'Дт':{start:10,received:0,spent:2,end:8}}}

test('motohour vehicle requires both counter readings for a new trip',()=>{
  const errors=basicTripErrors({...base,motohoursStart:'',motohoursEnd:'',motohours:''},{hasMotohours:true})
  assert.ok(errors.includes('Не заполнены оба показания моточасов.'))
})

test('motohour counter end cannot be below start',()=>{
  const errors=basicTripErrors({...base,motohoursStart:20,motohoursEnd:19},{hasMotohours:true})
  assert.ok(errors.includes('Конечные моточасы меньше начальных.'))
})

test('legacy motohours value remains valid',()=>{
  const errors=basicTripErrors({...base,motohours:3.5},{hasMotohours:true})
  assert.equal(errors.some(x=>x.includes('моточас')),false)
})

test('unused trip does not require fake motohours or GSM',()=>{
  const errors=basicTripErrors({date:'2026-09-01',number:'2',odoStart:100,odoEnd:100,unused:true,gsm:{}},{hasMotohours:true})
  assert.equal(errors.length,0)
})
