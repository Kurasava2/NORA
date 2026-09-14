import { num, round2 } from './numbers.js'
import { RATE_PER_MOTOHOUR, normalizeRateType } from './vehicleMetrics.js'

export const ALLOC_MINIMIZE = 'minimize'
export const ALLOC_PRIORITY = 'priority'
export const ALLOC_PROPORTIONAL = 'proportional'
export const ALLOC_NONE = 'none'
export const ALLOCATION_MODES = [ALLOC_MINIMIZE, ALLOC_PRIORITY, ALLOC_PROPORTIONAL, ALLOC_NONE]

const BASE_ALIASES = {
  'КМ': 'КМ', 'ПРОБЕГ': 'КМ', 'KM': 'КМ', 'MILEAGE': 'КМ',
  'МОТОЧАСЫ': 'МОТОЧАСЫ', 'МЧ': 'МОТОЧАСЫ', 'MOTOHOURS': 'МОТОЧАСЫ', 'MH': 'МОТОЧАСЫ',
  'НОРМА': 'НОРМА', 'RATE': 'НОРМА'
}

export function normalizeCalcCode(value, fallback='') {
  const raw = String(value ?? '').trim().toUpperCase().replace(/Ё/g,'Е')
  const cleaned = raw.replace(/[^A-ZА-Я0-9_]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_')
  return cleaned || fallback
}

export function isCalcCode(value){ return /^[A-ZА-Я_][A-ZА-Я0-9_]*$/.test(normalizeCalcCode(value)) }

export function normalizeParam(param={}){
  const code=normalizeCalcCode(param.code || param.label || 'ПАРАМЕТР')
  return {id:String(param.id||code||Date.now()),code,label:String(param.label||code),defaultValue:param.defaultValue==null?'':param.defaultValue}
}

export function normalizeRule(rule={}){
  const code=normalizeCalcCode(rule.code || rule.name || 'РАСХОД')
  const allocation=ALLOCATION_MODES.includes(rule.allocation)?rule.allocation:ALLOC_MINIMIZE
  const roundingRaw=num(rule.rounding),rounding=roundingRaw!==null&&roundingRaw>0?roundingRaw:0.01
  return {
    id:String(rule.id||code||Date.now()),
    name:String(rule.name||code),
    code,
    formula:String(rule.formula||''),
    materials:[...new Set((rule.materials||[]).map(String).filter(Boolean))],
    allocation,
    priority:[...new Set((rule.priority||[]).map(String).filter(Boolean))],
    rounding
  }
}

export function normalizeAutoCalc(config={}){
  return {
    enabled:config?.enabled!==false,
    params:Array.isArray(config?.params)?config.params.map(normalizeParam):[],
    rules:Array.isArray(config?.rules)?config.rules.map(normalizeRule):[]
  }
}

export function inferFuelMaterials(vehicle,catalog=[]){
  const id=String(vehicle?.id||'')
  const defaults=new Set((vehicle?.defaultMaterials||[]).map(String))
  const linked=(catalog||[]).filter(m=>String(m.category||'').toLowerCase()==='топливо' && ((m.sourceVehicles||[]).map(String).includes(id)||defaults.has(m.name))).map(m=>m.name)
  const fallback=[...(vehicle?.defaultMaterials||[])].filter(name=>/^Д[тТ](?:\s|$)/.test(String(name)))
  return [...new Set([...linked,...fallback])]
}

export function defaultAutoCalcForVehicle(vehicle,catalog=[]){
  const baseRate=num(vehicle?.baseRate)
  if(baseRate===null||baseRate<0)return {enabled:true,params:[],rules:[]}
  const rateType=normalizeRateType(vehicle?.rateType)
  const materials=inferFuelMaterials(vehicle,catalog)
  return normalizeAutoCalc({enabled:true,params:[],rules:[{
    id:'rule_fuel',name:'Топливо',code:'ТОПЛИВО',
    formula:rateType===RATE_PER_MOTOHOUR?'МОТОЧАСЫ * НОРМА':'КМ * НОРМА / 100',
    materials,allocation:ALLOC_MINIMIZE,priority:materials,rounding:0.01
  }]})
}

export function vehicleAutoCalc(vehicle,catalog=[]){
  return normalizeAutoCalc(vehicle?.autoCalc || defaultAutoCalcForVehicle(vehicle,catalog))
}

function tokenize(expression){
  const s=String(expression||'').replace(/,/g,'.')
  const out=[];let i=0
  while(i<s.length){
    const ch=s[i]
    if(/\s/.test(ch)){i++;continue}
    if(/[0-9.]/.test(ch)){
      let j=i+1;while(j<s.length&&/[0-9.]/.test(s[j]))j++
      const raw=s.slice(i,j);if(!/^\d+(?:\.\d+)?$/.test(raw)&&!/^\.\d+$/.test(raw))throw new Error(`Некорректное число «${raw}»`)
      out.push({type:'number',value:Number(raw)});i=j;continue
    }
    if(/[A-Za-zА-Яа-яЁё_]/.test(ch)){
      let j=i+1;while(j<s.length&&/[A-Za-zА-Яа-яЁё0-9_]/.test(s[j]))j++
      out.push({type:'ident',value:normalizeCalcCode(s.slice(i,j))});i=j;continue
    }
    if('+-*/^()'.includes(ch)){out.push({type:ch==='('? 'lparen':ch===')'?'rparen':'op',value:ch});i++;continue}
    throw new Error(`Недопустимый символ «${ch}»`)
  }
  return out
}

const PRECEDENCE={'+':1,'-':1,'*':2,'/':2,'^':3,'u+':4,'u-':4}
const RIGHT_ASSOC=new Set(['^','u+','u-'])

function toRpn(tokens){
  const output=[],ops=[];let prev='start'
  for(const token of tokens){
    if(token.type==='number'||token.type==='ident'){output.push(token);prev='value';continue}
    if(token.type==='lparen'){ops.push(token);prev='lparen';continue}
    if(token.type==='rparen'){
      while(ops.length&&ops[ops.length-1].type!=='lparen')output.push(ops.pop())
      if(!ops.length)throw new Error('Лишняя закрывающая скобка')
      ops.pop();prev='value';continue
    }
    if(token.type==='op'){
      let op=token.value
      if((op==='+'||op==='-')&&(prev==='start'||prev==='op'||prev==='lparen'))op=`u${op}`
      while(ops.length&&ops[ops.length-1].type==='op'){
        const top=ops[ops.length-1].value
        const shouldPop=RIGHT_ASSOC.has(op)?PRECEDENCE[op]<PRECEDENCE[top]:PRECEDENCE[op]<=PRECEDENCE[top]
        if(!shouldPop)break
        output.push(ops.pop())
      }
      ops.push({type:'op',value:op});prev='op'
    }
  }
  while(ops.length){const op=ops.pop();if(op.type==='lparen')throw new Error('Не закрыта скобка');output.push(op)}
  return output
}

export function formulaIdentifiers(expression){
  return [...new Set(tokenize(expression).filter(t=>t.type==='ident').map(t=>t.value))]
}

export function validateFormulaSyntax(expression){
  if(!String(expression||'').trim())throw new Error('Формула пустая')
  let depth=0
  for(const t of toRpn(tokenize(expression))){
    if(t.type==='number'||t.type==='ident'){depth++;continue}
    if(t.type==='op'&&(t.value==='u+'||t.value==='u-')){if(depth<1)throw new Error('Не хватает значения в формуле');continue}
    if(t.type==='op'){if(depth<2)throw new Error('Не хватает значения в формуле');depth--}
  }
  if(depth!==1)throw new Error('Формула составлена некорректно')
  return true
}

export function evaluateFormula(expression,variables={}){
  if(!String(expression||'').trim())throw new Error('Формула пустая')
  const vars={}
  for(const [k,v] of Object.entries(variables||{}))vars[normalizeCalcCode(k)]=v
  const stack=[]
  for(const t of toRpn(tokenize(expression))){
    if(t.type==='number'){stack.push(t.value);continue}
    if(t.type==='ident'){
      const alias=BASE_ALIASES[t.value]||t.value
      const raw=vars[alias] ?? vars[t.value]
      const n=num(raw)
      if(n===null)throw new Error(`Не задан параметр «${t.value}»`)
      stack.push(n);continue
    }
    if(t.type==='op'){
      if(t.value==='u+'||t.value==='u-'){
        if(stack.length<1)throw new Error('Ошибка унарного оператора')
        const a=stack.pop();stack.push(t.value==='u-'?-a:a);continue
      }
      if(stack.length<2)throw new Error('Не хватает значения в формуле')
      const b=stack.pop(),a=stack.pop();let v
      if(t.value==='+')v=a+b
      else if(t.value==='-')v=a-b
      else if(t.value==='*')v=a*b
      else if(t.value==='/'){if(Math.abs(b)<1e-12)throw new Error('Деление на ноль');v=a/b}
      else if(t.value==='^')v=a**b
      if(!Number.isFinite(v))throw new Error('Результат формулы не является конечным числом')
      stack.push(v)
    }
  }
  if(stack.length!==1)throw new Error('Формула составлена некорректно')
  return stack[0]
}

function roundStep(value,step=0.01){
  const s=num(step);if(s===null||s<=0)return round2(value)
  const out=Math.round((value+Number.EPSILON)/s)*s
  return Math.round((out+Number.EPSILON)*1e6)/1e6
}

function availableFor(entry){
  const start=num(entry?.start)||0,received=num(entry?.received)||0
  return Math.max(0,start+received)
}

export function allocateConsumption(total,materials,entries,mode=ALLOC_MINIMIZE,priority=[],rounding=0.01){
  let remaining=Math.max(0,num(total)||0)
  const rows=(materials||[]).map((material,index)=>({material,index,available:availableFor(entries?.[material])})).filter(r=>r.available>0||entries?.[r.material])
  const result=new Map(rows.map(r=>[r.material,{material:r.material,available:r.available,spent:0,end:r.available}]))
  if(mode===ALLOC_NONE)return {allocations:[...result.values()],shortage:remaining,unallocated:remaining}
  let ordered=[...rows]
  if(mode===ALLOC_MINIMIZE)ordered.sort((a,b)=>a.available-b.available||a.index-b.index)
  if(mode===ALLOC_PRIORITY){const pos=new Map((priority||[]).map((m,i)=>[m,i]));ordered.sort((a,b)=>(pos.get(a.material)??9999)-(pos.get(b.material)??9999)||a.index-b.index)}
  if(mode===ALLOC_PROPORTIONAL){
    const capacity=rows.reduce((s,r)=>s+r.available,0)
    const use=Math.min(remaining,capacity)
    let assigned=0
    rows.forEach((r,i)=>{let spent=i===rows.length-1?use-assigned:roundStep(capacity?use*r.available/capacity:0,rounding);spent=Math.min(r.available,Math.max(0,spent));assigned+=spent;const x=result.get(r.material);x.spent=spent;x.end=roundStep(r.available-spent,rounding)})
    remaining=Math.max(0,total-assigned)
    return {allocations:[...result.values()],shortage:roundStep(remaining,rounding),unallocated:roundStep(remaining,rounding)}
  }
  for(const r of ordered){
    if(remaining<=1e-9)break
    const spent=Math.min(r.available,remaining),x=result.get(r.material)
    x.spent=roundStep(spent,rounding);x.end=roundStep(r.available-spent,rounding);remaining=roundStep(remaining-spent,rounding)
  }
  return {allocations:[...result.values()],shortage:Math.max(0,roundStep(remaining,rounding)),unallocated:Math.max(0,roundStep(remaining,rounding))}
}

export function autoCalcBaseVariables(vehicle,trip){
  const odoStart=num(trip?.odoStart),odoEnd=num(trip?.odoEnd),mhStart=num(trip?.motohoursStart),mhEnd=num(trip?.motohoursEnd)
  const km=odoStart!==null&&odoEnd!==null?odoEnd-odoStart:null
  const mh=mhStart!==null&&mhEnd!==null?mhEnd-mhStart:num(trip?.motohours)
  const vars={КМ:km,МОТОЧАСЫ:mh,НОРМА:num(vehicle?.baseRate)}
  for(const [k,v] of Object.entries(trip?.calcInputs||{}))vars[normalizeCalcCode(k)]=num(v)
  return vars
}

export function autoCalcSignature(vehicle,trip){
  const config=vehicleAutoCalc(vehicle,[])
  const materials=[...new Set(config.rules.flatMap(r=>r.materials||[]))].sort()
  const balances={}
  for(const m of materials){const q=trip?.gsm?.[m]||{};balances[m]={start:num(q.start),received:num(q.received)}}
  return JSON.stringify({vars:autoCalcBaseVariables(vehicle,trip),inputs:trip?.calcInputs||{},balances})
}

export function calculateVehicleConsumption(vehicle,trip,catalog=[]){
  const config=vehicleAutoCalc(vehicle,catalog)
  if(!config.enabled)return {ok:false,errors:['Автоматический расчёт выключен для этой машины.'],rules:[],variables:{}}
  const base=autoCalcBaseVariables(vehicle,trip),rules=config.rules.map(normalizeRule),byCode=new Map(),errors=[]
  for(const rule of rules){if(byCode.has(rule.code))errors.push(`Повторяется код результата «${rule.code}».`);else byCode.set(rule.code,rule)}
  const variables={...base}
  for(const p of config.params){const code=normalizeCalcCode(p.code),v=variables[code]??num(p.defaultValue);if(v!==null)variables[code]=v}
  const done=new Map(),visiting=new Set()
  const evalRule=rule=>{
    if(done.has(rule.code))return done.get(rule.code)
    if(visiting.has(rule.code))throw new Error(`Циклическая зависимость правил: ${[...visiting,rule.code].join(' → ')}`)
    visiting.add(rule.code)
    for(const ident of formulaIdentifiers(rule.formula))if(byCode.has(ident)&&!done.has(ident)){const dep=evalRule(byCode.get(ident));variables[ident]=dep.value}
    let value=evaluateFormula(rule.formula,variables)
    if(value<0)throw new Error(`Правило «${rule.name}» дало отрицательный расход`)
    value=roundStep(value,rule.rounding)
    variables[rule.code]=value
    const allocation=allocateConsumption(value,rule.materials,trip?.gsm||{},rule.allocation,rule.priority,rule.rounding)
    const out={...rule,value,...allocation}
    visiting.delete(rule.code);done.set(rule.code,out);return out
  }
  const results=[]
  for(const rule of rules){try{results.push(evalRule(rule))}catch(error){errors.push(`${rule.name}: ${error.message}`)}}
  return {ok:errors.length===0,errors,rules:results,variables,signature:autoCalcSignature(vehicle,trip)}
}
