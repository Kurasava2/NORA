const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {writeJsonAtomic,loadJsonWithRecovery}=require('../electron/storage.cjs')
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'gsm-storage-'))}

test('atomic save создаёт новый файл и сохраняет предыдущий в .bak',()=>{const d=temp(),f=path.join(d,'gsm-data.json');writeJsonAtomic(f,{n:1});writeJsonAtomic(f,{n:2});assert.equal(JSON.parse(fs.readFileSync(f)).n,2);assert.equal(JSON.parse(fs.readFileSync(f+'.bak')).n,1);fs.rmSync(d,{recursive:true,force:true})})
test('load recovery использует валидный tmp или backup',()=>{const d=temp(),f=path.join(d,'gsm-data.json');fs.writeFileSync(f,'{broken');fs.writeFileSync(f+'.bak',JSON.stringify({ok:'bak'}));const r=loadJsonWithRecovery(f);assert.equal(r.data.ok,'bak');assert.equal(r.recoveredFrom,'backup');fs.rmSync(d,{recursive:true,force:true})})
test('atomic save откатывает старую базу если финальный rename не удался',()=>{const d=temp(),f=path.join(d,'gsm-data.json');writeJsonAtomic(f,{n:1});const real=fs.renameSync;fs.renameSync=(a,b)=>{if(String(a).endsWith('.tmp')&&b===f)throw Object.assign(new Error('simulated'),{code:'EIO'});return real(a,b)};try{assert.throws(()=>writeJsonAtomic(f,{n:2}),/simulated/)}finally{fs.renameSync=real}assert.equal(JSON.parse(fs.readFileSync(f)).n,1);fs.rmSync(d,{recursive:true,force:true})})
