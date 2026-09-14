const test=require('node:test')
const assert=require('node:assert/strict')
async function api(){return import('../src/lib/trips.js')}
test('путёвки сортируются по дате',async()=>{const {sortTripsInPlace}=await api();const a=[{date:'2026-02-02',number:'1'},{date:'2026-02-01',number:'9'}];sortTripsInPlace(a);assert.equal(a[0].date,'2026-02-01')})
test('внутри даты сортировка учитывает номер',async()=>{const {sortTripsInPlace}=await api();const a=[{date:'2026-02-01',number:'10'},{date:'2026-02-01',number:'2'}];sortTripsInPlace(a);assert.equal(a[0].number,'2')})
test('seq стабилизирует одинаковые дату и номер',async()=>{const {compareTrips}=await api();assert.ok(compareTrips({date:'2026-01-01',number:'1',seq:1},{date:'2026-01-01',number:'1',seq:2})<0)})
