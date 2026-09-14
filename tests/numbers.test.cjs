const test = require('node:test')
const assert = require('node:assert/strict')

async function mod(){ return import('../src/lib/numbers.js') }

test('num принимает запятую и пробелы', async()=>{ const {num}=await mod(); assert.equal(num('1 234,5'),1234.5) })
test('num возвращает null для пустого/мусора', async()=>{ const {num}=await mod(); assert.equal(num(''),null); assert.equal(num('abc'),null) })
test('toleranceOf сохраняет допустимый ноль', async()=>{ const {toleranceOf}=await mod(); assert.equal(toleranceOf(0),0); assert.equal(toleranceOf('0'),0) })
test('isNonZero уважает пользовательский tolerance', async()=>{ const {isNonZero}=await mod(); assert.equal(isNonZero(0.01,0),true); assert.equal(isNonZero(0.01,0.05),false) })
