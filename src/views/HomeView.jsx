import React, { useMemo, useRef } from 'react'
import { Button, Empty, Kpi, PageHead } from '../components/ui.jsx'
import { periodFleetRows } from '../lib/domain.js'
import { countForm, pluralRu, RU_FORMS } from '../lib/ru.js'
import { groupPeriods } from '../lib/viewData.js'
import PeriodYearSections from './home/PeriodYearSections.jsx'

function summarizePeriods(state, periods) {
  return periods.map(period => {
    const fleetRows = periodFleetRows(state, period)
    const errors = fleetRows.reduce(
      (errorCount, fleetRow) => errorCount + (fleetRow.status.key === 'bad' ? 1 : 0),
      0,
    )
    const drove = fleetRows.reduce(
      (drivenCount, fleetRow) => drivenCount + (fleetRow.stats.trips > 0 ? 1 : 0),
      0,
    )

    return {
      id: period.id,
      rows: fleetRows,
      errors,
      drove,
      stood: (state.vehicles || []).length - drove,
    }
  })
}

export default function HomeView({
  state,
  periods,
  onNew,
  onOpen,
  onImport,
  onDeletePeriod,
  onDeleteYear,
}) {
  const fileInputRef = useRef(null)
  const summaries = useMemo(() => summarizePeriods(state, periods), [state, periods])
  const summaryById = useMemo(
    () => new Map(summaries.map(summary => [summary.id, summary])),
    [summaries],
  )
  const overall = useMemo(
    () =>
      summaries.reduce(
        (totals, summary) => {
          for (const fleetRow of summary.rows) {
            if (fleetRow.status.key === 'idle') totals.idle += 1
            else totals.road += 1
            if (fleetRow.status.key === 'bad') totals.bad += 1
          }
          return totals
        },
        { road: 0, idle: 0, bad: 0 },
      ),
    [summaries],
  )
  const groups = useMemo(() => groupPeriods(periods), [periods])
  const vehicleCount = (state.vehicles || []).length
  const catalogCount = state.catalog.length

  const importSelectedFile = changeEvent => {
    const selectedFile = changeEvent.target.files?.[0]
    changeEvent.target.value = ''
    if (selectedFile) onImport(selectedFile)
  }

  return (
    <div className="page">
      <PageHead
        title="Расчётные периоды"
        subtitle={`${countForm(vehicleCount, RU_FORMS.vehicle)} · ${countForm(catalogCount, RU_FORMS.type)} ГСМ · локальная база`}
        actions={(
          <>
            <input
              ref={fileInputRef}
              className="hidden-input"
              type="file"
              accept=".xlsx,.xlsm"
              onChange={importSelectedFile}
            />
            <Button onClick={() => fileInputRef.current?.click()}>⇧ Создать месяц из книги</Button>
            <Button primary onClick={onNew}>＋ Новый период</Button>
          </>
        )}
      />

      <div className="kpi-grid">
        <Kpi value={periods.length} label={pluralRu(periods.length, ...RU_FORMS.month)} />
        <Kpi value={overall.road} label={`${pluralRu(overall.road, ...RU_FORMS.machineMonth)} с путёвками`} />
        <Kpi
          value={overall.idle}
          label={`${pluralRu(overall.idle, ...RU_FORMS.machineMonth)} без выезда`}
          tone="ok"
        />
        <Kpi
          value={overall.bad}
          label={overall.bad === 1 ? 'с ошибкой' : 'с ошибками'}
          tone={overall.bad ? 'bad' : undefined}
        />
        <Kpi
          value={vehicleCount}
          label={`${pluralRu(vehicleCount, ...RU_FORMS.vehicle)} в справочнике`}
        />
      </div>

      {groups.length ? (
        <PeriodYearSections
          groups={groups}
          summaryById={summaryById}
          onOpen={onOpen}
          onDeletePeriod={onDeletePeriod}
          onDeleteYear={onDeleteYear}
        />
      ) : (
        <Empty
          title="Создайте первый расчётный период"
          text="Периоды будут сгруппированы по годам и месяцам. Можно создать вручную или импортировать готовую Excel-книгу."
          action={(
            <div className="toolbar">
              <Button onClick={() => fileInputRef.current?.click()}>Импортировать книгу</Button>
              <Button primary onClick={onNew}>Создать период</Button>
            </div>
          )}
        />
      )}
    </div>
  )
}
