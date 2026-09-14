const test=require('node:test')
const assert=require('node:assert/strict')
async function smart(target, entry){ const {smartBalance}=await import('../src/lib/calculations.js'); return smartBalance(entry,target) }
const base={start:10,received:5,spent:3,end:12}
test('smartBalance считает end',async()=>assert.equal((await smart('end',{...base,end:''})).end,12))
test('smartBalance считает spent',async()=>assert.equal((await smart('spent',{...base,spent:''})).spent,3))
test('smartBalance считает received',async()=>assert.equal((await smart('received',{...base,received:''})).received,5))
test('smartBalance считает start',async()=>assert.equal((await smart('start',{...base,start:''})).start,10))
