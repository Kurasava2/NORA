import baseVehicles from '../data/vehicles.json'
import baseCatalog from '../data/catalog.json'
import { isNonZero, num, round2, toleranceOf } from './numbers.js'
import { smartBalance } from './calculations.js'
import { sortTripsInPlace } from './trips.js'
import { basicTripErrors } from './tripValidation.js'
import { syncCarriedStart } from './carry.js'

export const BASE_VEHICLES = baseVehicles
export const BASE_CATALOG = baseCatalog
export const STORAGE_VERSION = 6
export const DEFAULT_SETTINGS = {
  unit: 'Командир автомобильной роты войсковой части 98562',
  rank: 'капитан',
  commander: 'А. Геращенко',
  tolerance: 0.05,
  regMode: 'full',
  autosave: true,
  autosaveDelay: 400,
  directPrint: false,
  preferredPrinter: '',
  performanceMode: true
}
export const DEFAULT_STATE = { version: STORAGE_VERSION, settings: DEFAULT_SETTINGS, periods: [], vehicleSettings: {}, catalog: [] }

export const clone = value => typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value))
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
export const unique = values => [...new Set((values || []).filter(Boolean))]
export { num, round2, smartBalance, toleranceOf }
const NUMBER_FMT = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2})
const LONG_DATE_FMT = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'})
const MONTH_NAMES = Array.from({length:12},(_,m)=>{const t=new Intl.DateTimeFormat('ru-RU',{month:'long'}).format(new Date(2020,m,1));return t[0].toUpperCase()+t.slice(1)})
export function nfmt(value){ const n=num(value); if(n===null)return '—'; return NUMBER_FMT.format(n) }
export function kmfmt(value){ const n=num(value); if(n===null)return '—'; return String(Math.round(n*100)/100).replace('.',',') }
export function fmtDate(value){ if(!value)return '—'; const [y,m,d]=String(value).split('-'); return `${d}.${m}.${y}` }
export function longDate(value){ if(!value)return ''; return LONG_DATE_FMT.format(new Date(`${value}T12:00:00`)).replace(/\s+г\.$/u,' г') }
export const periodName = p => `${fmtDate(p.start)} — ${fmtDate(p.end)}`
export const reportMonthOf = p => p?.reportMonth || String(p?.end||p?.start||'').slice(0,7)
export function periodMonthName(p){ const v=reportMonthOf(p); if(!/^\d{4}-\d{2}$/.test(v))return 'Без месяца'; const m=Number(v.slice(5,7)); return MONTH_NAMES[m-1]||'Без месяца' }
export const periodYear = p => Number(reportMonthOf(p).slice(0,4)) || 0
export const periodDisplayName = p => `${periodMonthName(p)} ${periodYear(p)}`.trim()
export const safeFile = s => String(s).replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ').trim()
export function isoDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function presetDates(month,preset){ const [y,mo]=month.split('-').map(Number); if(!y||!mo)return{start:'',end:''}; if(preset==='calendar')return{start:isoDate(new Date(y,mo-1,1)),end:isoDate(new Date(y,mo,0))}; const day=Number(preset||21); return {start:isoDate(new Date(y,mo-2,day)),end:isoDate(new Date(y,mo-1,day===21?20:25))} }
export const sortedPeriods = state => [...state.periods].sort((a,b)=>reportMonthOf(b).localeCompare(reportMonthOf(a))||b.start.localeCompare(a.start))

function normalizeCatalogName(name){ return String(name||'').replace(/^ДТ(?=\s|$)/i,'Дт') }
export function mergeCatalog(existing=[]){ const map=new Map(); for(const b of BASE_CATALOG){ const x=clone(b); x.name=normalizeCatalogName(x.name); x.aliases=unique([...(x.aliases||[]), b.name]); map.set(x.name.toLowerCase(),x) } for(const e0 of existing){ const e=clone(e0), name=normalizeCatalogName(e.name), k=name.toLowerCase(), cur=map.get(k); map.set(k,cur?{...cur,...e,name,aliases:unique([...(cur.aliases||[]),...(e.aliases||[]),e0.name])}:{...e,name}) } return [...map.values()] }
export function migrateState(input) {
  const s = input && typeof input === 'object' ? clone(input) : clone(DEFAULT_STATE)
  s.version = STORAGE_VERSION
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) }
  s.periods = Array.isArray(s.periods) ? s.periods : []
  s.vehicleSettings = s.vehicleSettings || {}
  s.catalog = mergeCatalog(s.catalog || [])
  for (const p of s.periods) {
    p.reportMonth = p.reportMonth || String(p.end || p.start || '').slice(0, 7)
    p.statements = Array.isArray(p.statements) ? p.statements : []
    for (const st of p.statements) {
      st.materials = []
      st.trips = Array.isArray(st.trips) ? st.trips : []
      st.opening = st.opening || null
      for (const t of st.trips) {
        t.gsm = t.gsm || {}
        t.seq = t.seq || Date.now() + Math.random()
        for (const q of Object.values(t.gsm)) {
          if (q && typeof q === 'object') {
            q._carried = !!q._carried
            q._autoTarget = q._autoTarget || ''
          }
        }
      }
      sortTrips(st)
      syncStatementMaterials(st)
    }
  }
  return s
}

const BASE_VEHICLE_BY_ID = new Map(BASE_VEHICLES.map(v=>[v.id,v]))
const CATALOG_INDEX_CACHE = new WeakMap()
const PERIOD_ROWS_CACHE = new WeakMap()
const VEHICLE_HISTORY_CACHE = new WeakMap()
function catalogIndex(catalog){
  let idx=CATALOG_INDEX_CACHE.get(catalog)
  if(idx)return idx
  const byName=new Map(),byAlias=new Map()
  for(const x of catalog||[]){byName.set(x.name,x);for(const a of x.aliases||[])byAlias.set(a,x)}
  idx={byName,byAlias};CATALOG_INDEX_CACHE.set(catalog,idx);return idx
}
export const baseVehicle=id=>BASE_VEHICLE_BY_ID.get(id)||null
export function vehicleOf(state,id){ const b=baseVehicle(id); if(!b)return null; const o=state.vehicleSettings?.[id]; return o?{...b,...o}:b }
export function materialOf(state,name){ const normalized=normalizeCatalogName(name),idx=catalogIndex(state.catalog); return idx.byName.get(normalized)||idx.byAlias.get(name)||{name:normalized,category:/^Д[тТ](?=\s|$)/.test(normalized)?'Топливо':'Масло',unit:'л',aliases:[]} }
export function materialDisplayName(name){ return normalizeCatalogName(name) }
export function materialCellName(name){ const n=normalizeCatalogName(name); return n.replace(/^Масло\s+/i,'') }
export function materialSummaryName(name){ return materialCellName(name) }
export function tripMaterialNames(t){ return Object.keys(t?.gsm||{}) }
export function statementMaterialNames(st){ const out=[]; for(const t of st?.trips||[])for(const m of tripMaterialNames(t))if(!out.includes(m))out.push(m); return out }
export function syncStatementMaterials(st){ if(st)st.materials=statementMaterialNames(st); return st?.materials||[] }
export function nonZero(state,v){ return isNonZero(v,state?.settings?.tolerance) }
export function sortTrips(st){ if(st)sortTripsInPlace(st.trips); return st?.trips||[] }
export function findPrevStatement(state,vehicleId,p){ const candidates=state.periods.filter(x=>x.id!==p.id&&x.end<p.start).sort((a,b)=>b.end.localeCompare(a.end)); for(const pp of candidates){ const st=(pp.statements||[]).find(s=>s.vehicleId===vehicleId&&s.trips?.length); if(st)return{period:pp,statement:st} } return null }
export function buildOpening(state,vehicleId,p){ const prev=findPrevStatement(state,vehicleId,p); if(!prev)return null; const pst=prev.statement,last=pst.trips[pst.trips.length-1],gsm={}; for(const m of tripMaterialNames(last)){ const end=num(last?.gsm?.[m]?.end); if(end!==null&&nonZero(state,end))gsm[m]=end } const check=validateStatement(state,pst,prev.period); return{sourcePeriodId:prev.period.id,sourceStatementId:pst.id,sourceLabel:periodName(prev.period),odo:num(last?.odoEnd),gsm,sourceHasErrors:check.errors.length>0} }
export function createStatement(state,p,v){ return {id:uid(),vehicleId:v.id,materials:[],trips:[],opening:buildOpening(state,v.id,p),createdAt:new Date().toISOString()} }
export function predecessorTrip(st,tripId=null){ const trips=clone(st?.trips||[]); sortTrips({trips}); if(!tripId)return trips[trips.length-1]||null; const ix=trips.findIndex(t=>t.id===tripId); return ix>0?trips[ix-1]:null }
export function prefilledTrip(state,st,p,editingTrip=null){ if(editingTrip)return clone(editingTrip); const prev=predecessorTrip(st),gsm={},source=prev?(prev.gsm||{}):(st.opening?.gsm||{}); for(const [m,q] of Object.entries(source)){ const end=prev?num(q?.end):num(q); if(end!==null&&nonZero(state,end))gsm[m]={start:end,received:'',spent:'',end:'',_carried:true,_autoTarget:''} } return {id:uid(),seq:Date.now()+Math.random(),date:prev?.date||p.start,number:'',odoStart:prev?(num(prev.odoEnd)??''):(num(st.opening?.odo)??''),odoEnd:prev?(num(prev.odoEnd)??''):(num(st.opening?.odo)??''),motohours:'',unused:false,note:'',gsm} }
export function addTripMaterial(state,st,trip,name,editingTripId=null){ if(!name||trip.gsm?.[name])return trip; const prev=editingTripId?predecessorTrip(st,editingTripId):predecessorTrip(st), prevEnd=prev?num(prev.gsm?.[name]?.end):num(st.opening?.gsm?.[name]); trip.gsm=trip.gsm||{}; trip.gsm[name]={start:prevEnd!==null&&nonZero(state,prevEnd)?prevEnd:'',received:'',spent:'',end:'',_carried:prevEnd!==null&&nonZero(state,prevEnd),_autoTarget:''}; return trip }
export function reconcileCarryForward(state,st){ if(!st)return; sortTrips(st); const tol=toleranceOf(state?.settings?.tolerance); for(let i=0;i<st.trips.length;i++){ const t=st.trips[i]; t.gsm=t.gsm||{}; const source=i>0?(st.trips[i-1].gsm||{}):(st.opening?.gsm||{}); for(const [m,pq] of Object.entries(source)){ const pe=i>0?num(pq?.end):num(pq); if(pe!==null&&Math.abs(pe)>tol){if(!t.gsm[m])t.gsm[m]={start:pe,received:'',spent:'',end:'',_carried:true,_autoTarget:''};else syncCarriedStart(t.gsm[m],pe,tol)} } for(const [m,q] of Object.entries({...t.gsm})){ const pq=source[m],pe=i>0?num(pq?.end):num(pq); if((pe===null||Math.abs(pe)<=tol)&&q?._carried){ const s=num(q.start),r=num(q.received),sp=num(q.spent),e=num(q.end),noMove=(r===null||Math.abs(r)<=tol)&&(sp===null||Math.abs(sp)<=tol),onlyCarry=noMove&&(e===null||s===null||Math.abs(e-s)<=tol||Math.abs(e)<=tol); if(onlyCarry)delete t.gsm[m]; else {q.start='';q._carried=false;if(q._autoTarget==='start')q._autoTarget=''} } } } syncStatementMaterials(st) }

export function validateStatement(state, st, p) {
  const v = vehicleOf(state, st.vehicleId), tol = toleranceOf(state.settings.tolerance), errors = [], warnings = [], trips = st.trips || []
  if (!trips.length) return { errors, warnings, ok: true, idle: true }
  const nums = new Set()
  trips.forEach((t, i) => {
    const tag = `Путёвка №${t.number || '?'} (${fmtDate(t.date)})`
    for (const message of basicTripErrors(t, { period: p, hasMotohours: !!v?.hasMotohours, materialLabel: materialDisplayName })) errors.push(`${tag}: ${message}`)
    const number = String(t.number || '').trim()
    if (number) {
      if (nums.has(number)) errors.push(`${tag}: номер дублируется.`)
      nums.add(number)
    }
    const a = num(t.odoStart), b = num(t.odoEnd)
    if (t.unused && a !== null && b !== null && Math.abs(b - a) > 0.001) errors.push(`${tag}: неиспользованная путёвка имеет пробег.`)
    if (i === 0 && st.opening?.odo != null && a !== null && Math.abs(a - st.opening.odo) > 0.001) errors.push(`${tag}: начальный одометр не совпадает с предыдущим периодом.`)
    if (i > 0) {
      const prev = num(trips[i - 1].odoEnd)
      if (prev !== null && a !== null && Math.abs(a - prev) > 0.001) errors.push(`${tag}: начальный одометр не совпадает с предыдущей путёвкой.`)
    }
    const mats = tripMaterialNames(t)
    const prevGsm = i > 0 ? (trips[i - 1].gsm || {}) : (st.opening?.gsm || {})
    for (const [m, q] of Object.entries(prevGsm)) {
      const pe = i > 0 ? num(q?.end) : num(q)
      if (pe !== null && Math.abs(pe) > tol && !t.gsm?.[m]) errors.push(`${tag}: не перенесён остаток ${m} ${nfmt(pe)} л.`)
    }
    let fuelStart = 0, fuelEnd = 0
    for (const m of mats) {
      const q = t.gsm[m] || {}, s = num(q.start), r = num(q.received), sp = num(q.spent), e = num(q.end)
      if ([s, r, sp, e].every(x => x !== null)) {
        const ex = s + r - sp
        if (Math.abs(ex - e) > tol) errors.push(`${tag}: ${m} — остаток должен быть ${nfmt(ex)} л.`)
      }
      const pe = i > 0 ? num(trips[i - 1].gsm?.[m]?.end) : num(st.opening?.gsm?.[m])
      if (pe !== null && Math.abs(pe) > tol && s !== null && Math.abs(s - pe) > tol) errors.push(`${tag}: начальный остаток ${m} не совпадает с предыдущим.`)
      if (materialOf(state, m).category === 'Топливо') { fuelStart += s || 0; fuelEnd += e || 0 }
      if (t.unused && ((r || 0) !== 0 || (sp || 0) !== 0)) warnings.push(`${tag}: неиспользованная путёвка содержит движение ${m}.`)
    }
    if (v?.tankCapacity) {
      if (fuelStart > v.tankCapacity + tol) warnings.push(`${tag}: топливо перед выездом превышает бак.`)
      if (fuelEnd > v.tankCapacity + tol) warnings.push(`${tag}: остаток превышает бак.`)
    }
    if (t.unused && !String(t.note || '').toLowerCase().includes('неисп')) warnings.push(`${tag}: добавьте «неиспользованный» в примечание.`)
  })
  if (st.opening?.sourceHasErrors) warnings.push('Перенос сделан из ведомости с ошибками.')
  return { errors, warnings, ok: !errors.length }
}

export function statementStatus(state,st,p){ const c=validateStatement(state,st,p); if(!st.trips?.length)return{key:'idle',label:'Не ездила',tone:'ok',check:c}; if(c.errors.length)return{key:'bad',label:`${c.errors.length} ошибок`,tone:'bad',check:c}; if(c.warnings.length)return{key:'warn',label:`${c.warnings.length} замеч.`,tone:'warn',check:c}; return{key:'ok',label:'Готово',tone:'ok',check:c} }
export function stStats(state,st){ let km=0,fuel=0; for(const t of st.trips||[]){const a=num(t.odoStart),b=num(t.odoEnd);if(a!==null&&b!==null)km+=b-a;for(const m of tripMaterialNames(t))if(materialOf(state,m).category==='Топливо')fuel+=num(t.gsm?.[m]?.spent)||0}return{trips:st.trips?.length||0,km,fuel} }
export function totals(st){ const out={}; for(const m of statementMaterialNames(st)){let received=0,spent=0,start=null,end=null;for(const t of st.trips||[]){const q=t.gsm?.[m];if(!q)continue;if(start===null&&num(q.start)!==null)start=num(q.start);received+=num(q.received)||0;spent+=num(q.spent)||0;if(num(q.end)!==null)end=num(q.end)}out[m]={start:start??0,received,spent,end:end??0}}return out }
export function lastBalances(st){ const t=st.trips?.[st.trips.length-1]; const out={}; for(const m of tripMaterialNames(t)){const e=num(t.gsm?.[m]?.end);if(e!==null&&Math.abs(e)>1e-9)out[m]=e}return out }
export function periodFleetRows(state,p){ let cache=PERIOD_ROWS_CACHE.get(state);if(!cache){cache=new WeakMap();PERIOD_ROWS_CACHE.set(state,cache)}const hit=cache.get(p);if(hit)return hit;const byVehicle=new Map((p.statements||[]).map(st=>[st.vehicleId,st]));const rows=BASE_VEHICLES.map(base=>{const v=vehicleOf(state,base.id),st=byVehicle.get(base.id);if(!st)return{vehicle:v,statement:null,status:{key:'idle',label:'Не ездила',tone:'ok'},stats:{trips:0,km:0,fuel:0}};return{vehicle:v,statement:st,status:statementStatus(state,st,p),stats:stStats(state,st)}});cache.set(p,rows);return rows }
export function vehicleHistory(state,id){let cache=VEHICLE_HISTORY_CACHE.get(state);if(!cache){cache=new Map();VEHICLE_HISTORY_CACHE.set(state,cache)}if(cache.has(id))return cache.get(id);const rows=[];for(const p of sortedPeriods(state)){const st=(p.statements||[]).find(s=>s.vehicleId===id);if(st)rows.push({period:p,statement:st,status:statementStatus(state,st,p),stats:stStats(state,st),balances:lastBalances(st)})}cache.set(id,rows);return rows }
