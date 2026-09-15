import React, { useMemo } from 'react'
import { Button, Card, Kpi, PageHead } from '../components/ui.jsx'
import { kmfmt, nfmt, vehicleHistory } from '../lib/domain.js'
import { pluralRu, RU_FORMS } from '../lib/ru.js'
import HistoryTable from './history/HistoryTable.jsx'

export default function HistoryView({ state, vehicle, onBack, onOpen }) {
  const rows = useMemo(() => vehicleHistory(state, vehicle.id), [state, vehicle.id])
  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, historyRow) => ({
          trips: summary.trips + historyRow.stats.trips,
          kilometers: summary.kilometers + historyRow.stats.km,
          motohours: summary.motohours + (historyRow.stats.motohours || 0),
          fuel: summary.fuel + historyRow.stats.fuel,
        }),
        { trips: 0, kilometers: 0, motohours: 0, fuel: 0 },
      ),
    [rows],
  )
  const latestDrivenPeriod = useMemo(
    () => rows.find(historyRow => historyRow.statement.trips?.length),
    [rows],
  )
  const lastOdometer = latestDrivenPeriod
    ? kmfmt(latestDrivenPeriod.statement.trips.at(-1).odoEnd)
    : '—'

  return (
    <div className="page">
      <PageHead
        title={`История · ${vehicle.shortNo}`}
        subtitle={`${vehicle.model} · №${vehicle.reg}`}
        actions={<Button onClick={onBack}>← Автомобили</Button>}
      />
      <div className="kpi-grid">
        <Kpi value={rows.length} label={pluralRu(rows.length, ...RU_FORMS.period)} />
        <Kpi value={totals.trips} label={pluralRu(totals.trips, ...RU_FORMS.trip)} />
        <Kpi value={kmfmt(totals.kilometers)} label="км всего" />
        {vehicle.hasMotohours && <Kpi value={nfmt(totals.motohours)} label="моточасов" />}
        <Kpi value={nfmt(totals.fuel)} label="л топлива" />
        <Kpi value={lastOdometer} label="последний одометр" />
      </div>
      <Card>
        <div className="section-heading">
          <div><h3>Помесячная история</h3><p>Можно открыть источник любого переноса.</p></div>
        </div>
        <HistoryTable rows={rows} vehicle={vehicle} onOpen={onOpen} />
      </Card>
    </div>
  )
}
