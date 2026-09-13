import { fmtDate, longDate, materialCellName, materialSummaryName, nfmt, kmfmt, nonZero, num, statementMaterialNames, totals, tripMaterialNames } from './domain.js'
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const hasValue=(state,v)=>nonZero(state,v)
export function materialLinesText(state,t,field){return tripMaterialNames(t).map(m=>{const x=num(t.gsm?.[m]?.[field]);if(x===null||!hasValue(state,x))return'';return `${nfmt(x)} ${materialCellName(m)}`}).filter(Boolean).join('\n')}
const totalRaw=v=>{const n=num(v);return n===null?0:n}
export function xlsxModel(state, p, st, v) {
  const trips = st.trips || [], tot = totals(st), first = trips[0], last = trips[trips.length - 1]
  const motohourValues = trips.map(t => num(t.motohours))
  const motohoursComplete = !v.hasMotohours || motohourValues.every(value => value !== null)
  let km = 0
  const tripRows = trips.map((t, i) => {
    const a = num(t.odoStart), b = num(t.odoEnd)
    if (a !== null && b !== null) km += b - a
    return [i + 1, fmtDate(t.date), t.number, a, b, materialLinesText(state, t, 'start'), materialLinesText(state, t, 'received'), materialLinesText(state, t, 'spent'), materialLinesText(state, t, 'end'), v.hasMotohours ? (num(t.motohours) ?? '') : (a !== null && b !== null ? b - a : null), t.note || '']
  })
  const totalRow = ['', 'ИТОГО', '', num(first?.odoStart), num(last?.odoEnd), '', '', '', '', v.hasMotohours ? (motohoursComplete ? motohourValues.reduce((sum, value) => sum + value, 0) : '') : km, '']
  const materialRows = statementMaterialNames(st)
    .filter(m => { const q = tot[m]; return [q.start, q.received, q.spent, q.end].some(x => hasValue(state, x)) })
    .map(m => {
      const q = tot[m]
      const shown = value => hasValue(state, value) ? totalRaw(value) : ''
      return ['', '', '', materialSummaryName(m), '', shown(q.start), shown(q.received), shown(q.spent), shown(q.end), '', '']
    })
  const reg = state.settings.regMode === 'short' ? v.shortNo : v.reg
  return { name: v.shortNo, vehicleModel: v.model, vehicleNo: reg, shortNo: v.shortNo, hasMotohours: !!v.hasMotohours, period: `${fmtDate(p.start)} — ${fmtDate(p.end)}`, dateFrom: longDate(p.start), dateTo: longDate(p.end), title: `Расчетная ведомость расхода горючего и масла по путевым листам автомобиля ${v.model} №${reg}\nза ${longDate(p.start)} - ${longDate(p.end)}`, norm: v.normText, tripRows, totalRow, materialRows, signTitle: state.settings.unit, signLine: { rank: state.settings.rank, commander: state.settings.commander } }
}

function linesHtml(state,t,field){return materialLinesText(state,t,field).split('\n').filter(Boolean).map(esc).join('<br>')}
export function documentBodyHtml(state, p, st, v) {
  const trips = st.trips || [], first = trips[0], last = trips[trips.length - 1], tot = totals(st)
  const motohourValues = trips.map(t => num(t.motohours))
  const motohourTotal = motohourValues.every(value => value !== null) ? nfmt(motohourValues.reduce((sum, value) => sum + value, 0)) : '—'
  let km = 0
  trips.forEach(t => { const a = num(t.odoStart), b = num(t.odoEnd); if (a !== null && b !== null) km += b - a })
  const rows = trips.map((t, i) => {
    const a = num(t.odoStart), b = num(t.odoEnd)
    const work = v.hasMotohours ? nfmt(t.motohours) : (a !== null && b !== null ? kmfmt(b - a) : '—')
    return `<tr class="doc-trip-row"><td>${i + 1}</td><td>${esc(fmtDate(t.date))}</td><td>${esc(t.number)}</td><td>${kmfmt(t.odoStart)}</td><td>${kmfmt(t.odoEnd)}</td><td>${linesHtml(state,t,'start')}</td><td>${linesHtml(state,t,'received')}</td><td>${linesHtml(state,t,'spent')}</td><td>${linesHtml(state,t,'end')}</td><td>${work}</td><td class="text">${esc(t.note||'')}</td></tr>`
  }).join('')
  const shown = value => hasValue(state, value) ? nfmt(value) : ''
  const sums = statementMaterialNames(st).map(m => ({ m, q: tot[m] }))
    .filter(({ q }) => [q.start, q.received, q.spent, q.end].some(x => hasValue(state, x)))
    .map(({ m, q }) => `<tr class="doc-material-row"><td></td><td></td><td></td><td class="tot">${esc(materialSummaryName(m))}</td><td></td><td>${shown(q.start)}</td><td>${shown(q.received)}</td><td>${shown(q.spent)}</td><td>${shown(q.end)}</td><td></td><td></td></tr>`).join('')
  const reg = state.settings.regMode === 'short' ? v.shortNo : v.reg
  const totalWork = v.hasMotohours ? motohourTotal : kmfmt(km)
  return `<div class="paper"><div class="doc-title">Расчетная ведомость расхода горючего и масла по путевым листам автомобиля ${esc(v.model)} №${esc(reg)}<br>за ${esc(longDate(p.start))} - ${esc(longDate(p.end))}</div><div class="norm-text">${esc(v.normText)}</div><table class="doc-table"><thead><tr><th>№ п/п</th><th>Дата путевого листа</th><th>Номер путевого листа</th><th>Показания спидометра перед выездом</th><th>Показания спидометра после выезда</th><th>Наличие в баках перед выездом</th><th>Получено</th><th>Израсходовано</th><th>Наличие при постановке на стоянке</th><th>${v.hasMotohours?'Отработано моточасов':'Пройдено километров'}</th><th>Примечание</th></tr></thead><tbody>${rows}<tr class="doc-total-row"><td></td><td class="tot">ИТОГО</td><td></td><td>${kmfmt(first?.odoStart)}</td><td>${kmfmt(last?.odoEnd)}</td><td></td><td></td><td></td><td></td><td class="tot">${totalWork}</td><td></td></tr>${sums}</tbody></table><div class="doc-notes"><b>Примечание:</b> Полученные в автомобильной службе неиспользованные путевые листы наравне с использованными также заносятся в данную расчетную ведомость, в графе «примечание» такие путевые листы указываются как «неиспользованные».<br><b>Исправления, подтирания, замазывания в данной расчетной ведомости НЕ ДОПУСКАЕТСЯ.</b><br>Данные указанные в расчетной ведомости по пробегу и расходу горючего ${esc(v.model)} №${esc(reg)} <b>подтверждаю.</b></div><div class="doc-sign">${esc(state.settings.unit)}<div class="signline">${esc(state.settings.rank)}<span>__________</span>${esc(state.settings.commander)}</div></div></div>`
}

export function printHtml(state,p,st,v){return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:19.05mm 6.35mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:"Times New Roman",serif;font-size:10px}.paper{width:100%}.doc-title{text-align:center;font-weight:700;font-size:12px;line-height:1.25;margin-bottom:6px}.norm-text{text-align:justify;font-size:9px;line-height:1.15;margin-bottom:6px}.doc-table{width:100%;border-collapse:collapse;table-layout:fixed}.doc-table th,.doc-table td{border:1px solid #000;padding:2px 2px;vertical-align:middle;text-align:center;line-height:1.12;word-break:break-word}.doc-table th{font-size:8px}.doc-table td{font-size:8.5px}.doc-table .text{text-align:left}.tot{font-weight:700}.doc-notes{margin-top:6px;font-size:9px;line-height:1.2}.doc-sign{text-align:center;margin-top:9px}.signline{text-align:center;margin-top:6px}</style></head><body>${documentBodyHtml(state,p,st,v)}</body></html>`}
