const test=require('node:test')
const assert=require('node:assert/strict')
async function api(){return import('../src/lib/tripValidation.js')}
const period={start:'2026-01-01',end:'2026-01-31'}
const valid={date:'2026-01-02',number:'1',odoStart:100,odoEnd:110,motohourStart:200,motohourEnd:202,gsm:{'Дт':{start:10,received:0,spent:2,end:8}}}
test('обычная путёвка требует оба показания моточасов спецмашины',async()=>{const {basicTripErrors}=await api();assert.ok(basicTripErrors({...valid,motohourEnd:''},{period,hasMotohours:true}).some(x=>x.includes('показания моточасов')))})
test('конечные моточасы не могут быть меньше начальных',async()=>{const {basicTripErrors}=await api();assert.ok(basicTripErrors({...valid,motohourEnd:199},{period,hasMotohours:true}).some(x=>x.includes('меньше начальных')))})
test('старая запись с одним числом моточасов остаётся допустимой',async()=>{const {basicTripErrors}=await api();const legacy={...valid,motohourStart:'',motohourEnd:'',motohours:2};assert.equal(basicTripErrors(legacy,{period,hasMotohours:true}).filter(x=>x.includes('моточас')).length,0)})
test('неиспользованная путёвка не требует фиктивные моточасы и ГСМ',async()=>{const {basicTripErrors}=await api();const t={date:'2026-01-02',number:'2',odoStart:100,odoEnd:100,motohourStart:'',motohourEnd:'',gsm:{},unused:true};assert.deepEqual(basicTripErrors(t,{period,hasMotohours:true}),[])})
test('одометр назад является ошибкой',async()=>{const {basicTripErrors}=await api();assert.ok(basicTripErrors({...valid,odoEnd:99},{period}).some(x=>x.includes('меньше начального')))})
test('отрицательный ГСМ является ошибкой',async()=>{const {basicTripErrors}=await api();const t=structuredClone(valid);t.gsm['Дт'].spent=-1;assert.ok(basicTripErrors(t,{period}).some(x=>x.includes('отрицательное')))})
