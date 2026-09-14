import React, { useMemo, useRef } from 'react'
import { Badge, Button, Empty, Kpi, PageHead, cx } from '../components/ui.jsx'
import { fmtDate, periodFleetRows, periodMonthName } from '../lib/domain.js'
import { countForm, pluralRu, RU_FORMS } from '../lib/ru.js'
import { groupPeriods } from '../lib/viewData.js'

export default function HomeView({state,periods,onNew,onOpen,onImport,onDeletePeriod,onDeleteYear}) {
  const inputRef = useRef(null)
  const summaries = useMemo(() => periods.map(p => {
    const rows = periodFleetRows(state,p)
    const errors = rows.reduce((n,r) => n + (r.status.key === 'bad' ? 1 : 0), 0)
    const drove = rows.reduce((n,r) => n + (r.stats.trips > 0 ? 1 : 0), 0)
    return { id:p.id, rows, errors, drove, stood:(state.vehicles||[]).length-drove }
  }), [state,periods])
  const summaryById = useMemo(() => new Map(summaries.map(x => [x.id,x])), [summaries])
  const {road,idle,bad} = useMemo(() => summaries.reduce((a,x) => {
    for (const r of x.rows) {
      if (r.status.key === 'idle') a.idle++; else a.road++
      if (r.status.key === 'bad') a.bad++
    }
    return a
  }, {road:0,idle:0,bad:0}), [summaries])
  const groups = useMemo(() => groupPeriods(periods), [periods])
  const vehicleCount = (state.vehicles||[]).length
  const catalogCount = state.catalog.length

  return <div className="page">
    <PageHead
      title="Расчётные периоды"
      subtitle={`${countForm(vehicleCount,RU_FORMS.vehicle)} · ${countForm(catalogCount,RU_FORMS.type)} ГСМ · локальная база`}
      actions={<>
        <input ref={inputRef} className="hidden-input" type="file" accept=".xlsx,.xlsm" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)onImport(f)}}/>
        <Button onClick={()=>inputRef.current?.click()}>⇧ Создать месяц из книги</Button>
        <Button primary onClick={onNew}>＋ Новый период</Button>
      </>}
    />

    <div className="kpi-grid">
      <Kpi value={periods.length} label={pluralRu(periods.length,...RU_FORMS.month)}/>
      <Kpi value={road} label={`${pluralRu(road,...RU_FORMS.machineMonth)} с путёвками`}/>
      <Kpi value={idle} label={`${pluralRu(idle,...RU_FORMS.machineMonth)} без выезда`} tone="ok"/>
      <Kpi value={bad} label={bad === 1 ? 'с ошибкой' : 'с ошибками'} tone={bad?'bad':undefined}/>
      <Kpi value={vehicleCount} label={pluralRu(vehicleCount,...RU_FORMS.vehicle) + ' в справочнике'}/>
    </div>

    {groups.length ? <div className="year-sections year-sections-v141">
      {groups.map(([year,items],yearIndex) => <details className="year-section year-section-v141" key={year} defaultOpen={yearIndex===0}>
        <summary className="year-summary-v141">
          <span className="year-chevron">›</span>
          <b>{year}</b>
          <small>{countForm(items.length,RU_FORMS.month)}</small>
          <span className="year-summary-spacer"/>
          <Button small danger onClick={e=>{e.preventDefault();e.stopPropagation();onDeleteYear(year)}}>Удалить год</Button>
        </summary>
        <div className="period-list-v141">
          {items.map(p => {
            const {errors,drove,stood} = summaryById.get(p.id)
            return <div key={p.id} className={cx('period-row-v141',errors&&'has-errors')}>
              <button className="period-row-main-v141" onClick={()=>onOpen(p.id)}>
                <span className="period-row-month-v141">{periodMonthName(p)} {year}</span>
                <span className="period-row-range-v141">{fmtDate(p.start)} — {fmtDate(p.end)}</span>
                <span className="period-row-stat-v141"><b>{drove}</b> {pluralRu(drove,...RU_FORMS.vehicle)} с выездом</span>
                <span className="period-row-stat-v141"><b>{stood}</b> {pluralRu(stood,...RU_FORMS.vehicle)} без выезда</span>
                <span className="period-row-status-v141">{errors ? <Badge tone="bad">{countForm(errors,RU_FORMS.error)}</Badge> : <Badge tone="ok">Готово</Badge>}</span>
                <span className="period-row-arrow-v141">›</span>
              </button>
              <Button small danger onClick={()=>onDeletePeriod(p.id)}>Удалить</Button>
            </div>
          })}
        </div>
      </details>)}
    </div> : <Empty title="Создайте первый расчётный период" text="Периоды будут сгруппированы по годам и месяцам. Можно создать вручную или импортировать готовую Excel-книгу." action={<div className="toolbar"><Button onClick={()=>inputRef.current?.click()}>Импортировать книгу</Button><Button primary onClick={onNew}>Создать период</Button></div>}/>}
  </div>
}
