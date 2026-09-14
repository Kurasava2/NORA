import React, { useEffect, useMemo, useState } from 'react'
import { Button, Field, Modal, cx } from '../components/ui.jsx'
import { uid } from '../lib/domain.js'
import { RATE_PER_100KM, RATE_PER_MOTOHOUR, normalizeRateType, rateUnitLabel } from '../lib/vehicleMetrics.js'
import {
  ALLOC_MINIMIZE, ALLOC_NONE, ALLOC_PRIORITY, ALLOC_PROPORTIONAL,
  defaultAutoCalcForVehicle, formulaIdentifiers, normalizeAutoCalc, normalizeCalcCode, validateFormulaSyntax
} from '../lib/autoCalc.js'

const blank={shortNo:'',model:'',reg:'',baseRate:'',rateType:RATE_PER_100KM,tankCapacity:'',normText:'',hasMotohours:false,autoCalc:{enabled:true,params:[],rules:[]}}
const ALLOC_LABELS={
  [ALLOC_MINIMIZE]:'Минимизировать количество остатков',
  [ALLOC_PRIORITY]:'Списывать по заданному приоритету',
  [ALLOC_PROPORTIONAL]:'Пропорционально текущим остаткам',
  [ALLOC_NONE]:'Только рассчитать общий расход'
}

const deep=value=>JSON.parse(JSON.stringify(value))

function FormulaTokens({form,rule,onInsert}){
  const tokens=['КМ','МОТОЧАСЫ','НОРМА',...(form.autoCalc?.params||[]).map(p=>p.code),...(form.autoCalc?.rules||[]).filter(r=>r.id!==rule.id).map(r=>r.code)]
  return <div className="formula-token-row"><span>Вставить:</span>{[...new Set(tokens.filter(Boolean))].map(t=><button type="button" className="formula-token" key={t} onClick={()=>onInsert(t)}>{t}</button>)}</div>
}

function SelectedMaterials({rule,moveMaterial,removeMaterial}){
  if(!rule.materials?.length)return <div className="muted">Материалы пока не выбраны.</div>
  return <div className="selected-materials">{rule.materials.map((m,i)=><div className="selected-material" key={m}><span>{i+1}. {m}</span><div><button type="button" disabled={i===0} onClick={()=>moveMaterial(i,-1)}>↑</button><button type="button" disabled={i===rule.materials.length-1} onClick={()=>moveMaterial(i,1)}>↓</button><button type="button" onClick={()=>removeMaterial(m)}>×</button></div></div>)}</div>
}

function AutoCalcEditor({form,setForm,catalog}){
  const auto=form.autoCalc||{enabled:true,params:[],rules:[]}
  const materials=useMemo(()=>[...(catalog||[])].filter(x=>x.active!==false).sort((a,b)=>String(a.category).localeCompare(String(b.category))||String(a.name).localeCompare(String(b.name))),[catalog])
  const updateAuto=fn=>setForm(f=>{const next=deep(f);next.autoCalc=next.autoCalc||{enabled:true,params:[],rules:[]};fn(next.autoCalc,next);return next})
  const addParam=()=>updateAuto(a=>a.params.push({id:`param_${uid()}`,code:`ПАРАМЕТР_${a.params.length+1}`,label:'Новый параметр',defaultValue:''}))
  const updateParam=(id,patch)=>updateAuto(a=>{const p=a.params.find(x=>x.id===id);if(p)Object.assign(p,patch)})
  const removeParam=id=>updateAuto(a=>{a.params=a.params.filter(x=>x.id!==id)})
  const addRule=()=>updateAuto(a=>a.rules.push({id:`rule_${uid()}`,name:'Новое правило',code:`РАСХОД_${a.rules.length+1}`,formula:'',materials:[],allocation:ALLOC_MINIMIZE,priority:[],rounding:0.01}))
  const updateRule=(id,patch)=>updateAuto(a=>{const r=a.rules.find(x=>x.id===id);if(r)Object.assign(r,patch)})
  const removeRule=id=>updateAuto(a=>{a.rules=a.rules.filter(x=>x.id!==id)})
  const seedBaseRule=()=>setForm(f=>{const next=deep(f);const seeded=defaultAutoCalcForVehicle({...next,id:next.id||'new'},catalog);next.autoCalc=seeded;return next})
  const toggleMaterial=(ruleId,name)=>updateAuto(a=>{const r=a.rules.find(x=>x.id===ruleId);if(!r)return;const exists=r.materials.includes(name);r.materials=exists?r.materials.filter(x=>x!==name):[...r.materials,name];r.priority=r.materials.slice()})
  const moveMaterial=(ruleId,index,dir)=>updateAuto(a=>{const r=a.rules.find(x=>x.id===ruleId);if(!r)return;const j=index+dir;if(j<0||j>=r.materials.length)return;[r.materials[index],r.materials[j]]=[r.materials[j],r.materials[index]];r.priority=r.materials.slice()})
  const appendToken=(ruleId,token)=>updateAuto(a=>{const r=a.rules.find(x=>x.id===ruleId);if(!r)return;const left=String(r.formula||'').trimEnd();r.formula=`${left}${left?' ':''}${token} `})
  return <section className="vehicle-auto-section span-2">
    <div className="section-heading"><div><h3>Автоматический расчёт расхода</h3><p>Формулы хранятся в карточке машины. В путёвке расчёт запускается только по кнопке и всегда остаётся доступным для ручной правки.</p></div><label className="calc-enable"><input type="checkbox" checked={auto.enabled!==false} onChange={e=>updateAuto(a=>a.enabled=e.target.checked)}/><span>Включён</span></label></div>
    <div className="auto-calc-tools"><Button type="button" small onClick={seedBaseRule}>Создать базовое правило из нормы</Button><Button type="button" small onClick={addParam}>＋ Параметр</Button><Button type="button" small primary onClick={addRule}>＋ Правило</Button></div>

    {!!auto.params.length&&<div className="calc-param-list"><h4>Дополнительные входные параметры путёвки</h4>{auto.params.map(p=><div className="calc-param-row" key={p.id}><Field label="Название"><input className="input" value={p.label||''} onChange={e=>updateParam(p.id,{label:e.target.value})}/></Field><Field label="Код в формуле"><input className="input" value={p.code||''} onChange={e=>updateParam(p.id,{code:normalizeCalcCode(e.target.value)})}/></Field><Field label="Значение по умолчанию"><input className="input" inputMode="decimal" value={p.defaultValue??''} onChange={e=>updateParam(p.id,{defaultValue:e.target.value})}/></Field><Button type="button" small danger onClick={()=>removeParam(p.id)}>Удалить</Button></div>)}</div>}

    <div className="calc-rule-list">{auto.rules.map((rule,index)=><div className="calc-rule-card" key={rule.id}>
      <div className="calc-rule-head"><div><span>Правило {index+1}</span><b>{rule.name||'Без названия'}</b></div><Button type="button" small danger onClick={()=>removeRule(rule.id)}>Удалить</Button></div>
      <div className="grid-3 calc-rule-main"><Field label="Название"><input className="input" value={rule.name||''} onChange={e=>updateRule(rule.id,{name:e.target.value})}/></Field><Field label="Код результата"><input className="input" value={rule.code||''} onChange={e=>updateRule(rule.id,{code:normalizeCalcCode(e.target.value)})}/></Field><Field label="Округление, л"><input className="input" inputMode="decimal" value={rule.rounding??0.01} onChange={e=>updateRule(rule.id,{rounding:e.target.value})}/></Field></div>
      <Field label="Формула"><input className="input formula-input" value={rule.formula||''} placeholder="КМ * НОРМА / 100" onChange={e=>updateRule(rule.id,{formula:e.target.value})}/></Field>
      <FormulaTokens form={form} rule={rule} onInsert={token=>appendToken(rule.id,token)}/>
      <div className="formula-meta">Используемые параметры: {(()=>{try{return formulaIdentifiers(rule.formula).join(', ')||'—'}catch{return 'ошибка формулы'}})()}</div>
      <div className="grid-2 calc-allocation"><Field label="Как распределять расход"><select className="select" value={rule.allocation||ALLOC_MINIMIZE} onChange={e=>updateRule(rule.id,{allocation:e.target.value})}>{Object.entries(ALLOC_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><div><span className="field-label">Материалы правила</span><div className="material-picker-grid">{materials.map(m=><label className={cx('material-pick',rule.materials?.includes(m.name)&&'selected')} key={m.name}><input type="checkbox" checked={!!rule.materials?.includes(m.name)} onChange={()=>toggleMaterial(rule.id,m.name)}/><span><b>{m.name}</b><small>{m.category}</small></span></label>)}</div></div></div>
      {rule.allocation===ALLOC_PRIORITY&&<><div className="field-label">Приоритет списания — сверху вниз</div><SelectedMaterials rule={rule} moveMaterial={(i,d)=>moveMaterial(rule.id,i,d)} removeMaterial={m=>toggleMaterial(rule.id,m)}/></>}
    </div>)}{!auto.rules.length&&<div className="empty-auto-rules">Правил пока нет. Можно создать базовое из основной нормы или добавить своё.</div>}</div>
  </section>
}

export default function VehicleModal({open,onClose,state,mutate,notify,vehicle=null}){
  const[form,setForm]=useState(blank)
  useEffect(()=>{if(open){const initial=vehicle?{...deep(blank),...deep(vehicle)}:deep(blank);initial.rateType=normalizeRateType(initial.rateType);if(initial.rateType===RATE_PER_MOTOHOUR)initial.hasMotohours=true;initial.autoCalc=normalizeAutoCalc(vehicle?.autoCalc || defaultAutoCalcForVehicle(initial,state.catalog||[]));setForm(initial)}},[open,vehicle?.id])
  const setRateType=value=>setForm(f=>{const rateType=normalizeRateType(value);return{...f,rateType,hasMotohours:rateType===RATE_PER_MOTOHOUR?true:f.hasMotohours}})
  const submit=e=>{e.preventDefault();const shortNo=String(form.shortNo||'').trim(),model=String(form.model||'').trim(),reg=String(form.reg||'').trim();if(!shortNo||!model)return notify('Укажите номер машины и модель.',true);if((state.vehicles||[]).some(v=>v.id!==vehicle?.id&&String(v.shortNo).trim().toLowerCase()===shortNo.toLowerCase()))return notify('Машина с таким номером уже есть.',true);const rateType=normalizeRateType(form.rateType),baseRate=form.baseRate===''?null:Number(form.baseRate);if(baseRate!==null&&(!Number.isFinite(baseRate)||baseRate<0))return notify('Норма расхода должна быть положительным числом.',true);const autoCalc=normalizeAutoCalc(form.autoCalc),allCodes=[...autoCalc.params.map(p=>p.code),...autoCalc.rules.map(r=>r.code)];if(new Set(allCodes).size!==allCodes.length)return notify('Коды параметров и результатов формул должны быть уникальными.',true);for(const r of autoCalc.rules){if(!r.formula.trim())return notify(`Заполните формулу правила «${r.name}».`,true);try{validateFormulaSyntax(r.formula)}catch(err){return notify(`Ошибка формулы «${r.name}»: ${err.message}`,true)}}const usedMaterials=new Map();for(const r of autoCalc.rules){if(r.allocation===ALLOC_NONE)continue;for(const m of r.materials){if(usedMaterials.has(m))return notify(`Материал «${m}» одновременно распределяется правилами «${usedMaterials.get(m)}» и «${r.name}».`,true);usedMaterials.set(m,r.name)}}const out={id:vehicle?.id||`vehicle_${uid()}`,shortNo,model,reg,baseRate,rateType,tankCapacity:form.tankCapacity===''?null:Number(form.tankCapacity),normText:String(form.normText||''),defaultMaterials:Array.isArray(vehicle?.defaultMaterials)?vehicle.defaultMaterials:[],hasMotohours:rateType===RATE_PER_MOTOHOUR||!!form.hasMotohours,autoCalc};mutate(next=>{const ix=(next.vehicles||[]).findIndex(v=>v.id===out.id);if(ix>=0)next.vehicles[ix]=out;else next.vehicles.push(out)});notify(vehicle?'Автомобиль обновлён':'Автомобиль добавлен');onClose()}
  const unit=rateUnitLabel(form)
  return <Modal open={open} onClose={onClose} extraWide title={vehicle?'Редактирование автомобиля':'Новый автомобиль'}><form onSubmit={submit}><div className="modal-body grid-2"><Field label="Номер машины"><input className="input" value={form.shortNo||''} onChange={e=>setForm(f=>({...f,shortNo:e.target.value}))}/></Field><Field label="Модель"><input className="input" value={form.model||''} onChange={e=>setForm(f=>({...f,model:e.target.value}))}/></Field><Field label="Регистрационный номер"><input className="input" value={form.reg||''} onChange={e=>setForm(f=>({...f,reg:e.target.value}))}/></Field><Field label="Тип нормы расхода"><select className="select" value={normalizeRateType(form.rateType)} onChange={e=>setRateType(e.target.value)}><option value={RATE_PER_100KM}>л / 100 км</option><option value={RATE_PER_MOTOHOUR}>л / моточас</option></select></Field><Field label={`Норма, ${unit}`}><input className="input" inputMode="decimal" value={form.baseRate??''} onChange={e=>setForm(f=>({...f,baseRate:e.target.value}))}/></Field><Field label="Вместимость бака, л"><input className="input" inputMode="decimal" value={form.tankCapacity??''} onChange={e=>setForm(f=>({...f,tankCapacity:e.target.value}))}/></Field><label className="toggle-card"><input type="checkbox" checked={!!form.hasMotohours} disabled={normalizeRateType(form.rateType)===RATE_PER_MOTOHOUR} onChange={e=>setForm(f=>({...f,hasMotohours:e.target.checked}))}/><span><b>Учёт моточасов</b><small>{normalizeRateType(form.rateType)===RATE_PER_MOTOHOUR?'Включён автоматически для нормы л/моточас':'Можно учитывать моточасы дополнительно к пробегу'}</small></span></label><Field className="span-2" label="Текст нормы / примечание"><textarea className="textarea vehicle-norm" value={form.normText||''} onChange={e=>setForm(f=>({...f,normText:e.target.value}))}/></Field><AutoCalcEditor form={form} setForm={setForm} catalog={state.catalog}/></div><div className="modal-actions"><Button type="button" onClick={onClose}>Отмена</Button><Button primary type="submit">{vehicle?'Сохранить':'Добавить'}</Button></div></form></Modal>}
