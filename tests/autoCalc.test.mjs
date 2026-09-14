import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLOC_MINIMIZE, ALLOC_PRIORITY, allocateConsumption, calculateVehicleConsumption,
  defaultAutoCalcForVehicle, evaluateFormula, validateFormulaSyntax
} from '../src/lib/autoCalc.js'

test('безопасный вычислитель соблюдает приоритет операций и кириллические переменные',()=>{
  assert.equal(evaluateFormula('КМ * НОРМА / 100 + РЕЙСЫ * 4',{КМ:500,НОРМА:59,РЕЙСЫ:2}),303)
  assert.equal(evaluateFormula('-(КМ - 10) / 2',{КМ:20}),-5)
  assert.throws(()=>evaluateFormula('КМ / 0',{КМ:1}),/Деление на ноль/)
})

test('проверка синтаксиса ловит незаконченные выражения',()=>{
  assert.equal(validateFormulaSyntax('(КМ + 2) * НОРМА'),true)
  assert.throws(()=>validateFormulaSyntax('КМ *'),/Не хватает значения|некорректно/)
  assert.throws(()=>validateFormulaSyntax('(КМ + 2'),/скобк/)
})

test('минимизация остатков полностью списывает меньший вид топлива',()=>{
  const result=allocateConsumption(450,['ДТ "А"','ДТ "З"'],{
    'ДТ "А"':{start:200,received:0},
    'ДТ "З"':{start:500,received:0}
  },ALLOC_MINIMIZE,[],0.01)
  const a=Object.fromEntries(result.allocations.map(x=>[x.material,x]))
  assert.equal(a['ДТ "А"'].spent,200)
  assert.equal(a['ДТ "А"'].end,0)
  assert.equal(a['ДТ "З"'].spent,250)
  assert.equal(a['ДТ "З"'].end,250)
  assert.equal(result.shortage,0)
})

test('приоритетное списание следует заданному порядку',()=>{
  const result=allocateConsumption(250,['А','З'],{А:{start:200},З:{start:500}},ALLOC_PRIORITY,['З','А'],0.01)
  const m=Object.fromEntries(result.allocations.map(x=>[x.material,x]))
  assert.equal(m['З'].spent,250)
  assert.equal(m['З'].end,250)
  assert.equal(m['А'].spent,0)
})

test('правила могут зависеть от результатов предыдущих правил',()=>{
  const vehicle={id:'v1',baseRate:50,rateType:'per100km',autoCalc:{enabled:true,params:[],rules:[
    {id:'fuel',name:'Топливо',code:'ТОПЛИВО',formula:'КМ * НОРМА / 100',materials:['ДТ "З"'],allocation:'minimize',rounding:0.01},
    {id:'oil',name:'Масло',code:'МАСЛО',formula:'ТОПЛИВО * 2.4 / 100',materials:['Масло "Р"'],allocation:'minimize',rounding:0.01}
  ]}}
  const trip={odoStart:1000,odoEnd:1500,gsm:{'ДТ "З"':{start:400,received:0},'Масло "Р"':{start:20,received:0}}}
  const out=calculateVehicleConsumption(vehicle,trip,[])
  assert.equal(out.ok,true)
  assert.equal(out.rules[0].value,250)
  assert.equal(out.rules[1].value,6)
  assert.equal(out.rules[0].allocations[0].end,150)
  assert.equal(out.rules[1].allocations[0].end,14)
})

test('циклическая зависимость правил отклоняется',()=>{
  const vehicle={id:'v1',baseRate:1,autoCalc:{enabled:true,params:[],rules:[
    {id:'a',name:'A',code:'A',formula:'B + 1',materials:[],allocation:'none'},
    {id:'b',name:'B',code:'B',formula:'A + 1',materials:[],allocation:'none'}
  ]}}
  const out=calculateVehicleConsumption(vehicle,{odoStart:0,odoEnd:1,gsm:{}},[])
  assert.equal(out.ok,false)
  assert.match(out.errors.join(' '),/Циклическая зависимость/)
})

test('базовое правило строится из нормы машины',()=>{
  const vehicle={id:'2283',baseRate:59,rateType:'per100km',defaultMaterials:['ДТ "З"']}
  const cfg=defaultAutoCalcForVehicle(vehicle,[{name:'ДТ "З"',category:'Топливо',sourceVehicles:['2283']}])
  assert.equal(cfg.rules[0].formula,'КМ * НОРМА / 100')
  assert.deepEqual(cfg.rules[0].materials,['ДТ "З"'])
})
