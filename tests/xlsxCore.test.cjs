const test=require('node:test')
const assert=require('node:assert/strict')
test('CRC32 соответствует стандартному test-vector',async()=>{const {crc32}=await import('../src/lib/xlsxCore.js');assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926)})
