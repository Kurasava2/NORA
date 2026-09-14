const test=require('node:test')
const assert=require('node:assert/strict')
async function api(){return import('../src/lib/importValidation.js')}
const p={start:'2026-01-21',end:'2026-02-20',reportMonth:'2026-02'}
test('один период из разных машин принимается',async()=>{const {resolveImportPeriod}=await api();assert.deepEqual(resolveImportPeriod([{vehicleId:'a',sheetName:'1',period:p},{vehicleId:'b',sheetName:'2',period:p}]),p)})
test('два листа одной машины отклоняются',async()=>{const {resolveImportPeriod}=await api();assert.throws(()=>resolveImportPeriod([{vehicleId:'a',sheetName:'1',period:p},{vehicleId:'a',sheetName:'2',period:p}]),/несколько листов/)})
test('смешанные расчётные периоды отклоняются',async()=>{const {resolveImportPeriod}=await api();assert.throws(()=>resolveImportPeriod([{vehicleId:'a',sheetName:'1',period:p},{vehicleId:'b',sheetName:'2',period:{...p,start:'2026-02-21',end:'2026-03-20',reportMonth:'2026-03'}}]),/разные расчётные периоды/)})
