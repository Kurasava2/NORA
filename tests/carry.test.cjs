const test=require('node:test')
const assert=require('node:assert/strict')
async function api(){return import('../src/lib/carry.js')}
test('автоперенос обновляет carried start',async()=>{const {syncCarriedStart}=await api();const q={start:5,_carried:true};syncCarriedStart(q,7,0.05);assert.equal(q.start,7)})
test('ручной start не перезаписывается переносом',async()=>{const {syncCarriedStart}=await api();const q={start:5,_carried:false};syncCarriedStart(q,7,0.05);assert.equal(q.start,5)})
