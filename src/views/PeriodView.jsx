import React, { useDeferredValue, useMemo, useState } from 'react'
import { Button, Card, Kpi, PageHead } from '../components/ui.jsx'
import useProgressiveRows from '../hooks/useProgressiveRows.js'
import {
  clone,
  createStatement,
  fmtDate,
  periodFleetRows,
  periodMonthName,
  periodYear,
  vehicleOf,
} from '../lib/domain.js'
import PeriodFleetTable from './period/PeriodFleetTable.jsx'

export default function PeriodView({ state, period, mutate, onOpen, onExport, onHistory }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const deferredQuery = useDeferredValue(query)
  const fleetRows = useMemo(() => periodFleetRows(state, period), [state, period])
  const visibleRows = useMemo(() => {
    const searchText = deferredQuery.toLowerCase().trim()
    return fleetRows.filter(fleetRow => {
      const vehicleText = `${fleetRow.vehicle.shortNo} ${fleetRow.vehicle.model} ${fleetRow.vehicle.reg}`
      const matchesSearch = !searchText || vehicleText.toLowerCase().includes(searchText)
      const matchesStatus = statusFilter === 'all' || fleetRow.status.key === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [fleetRows, deferredQuery, statusFilter])
  const countsByStatus = useMemo(
    () =>
      fleetRows.reduce((counts, fleetRow) => {
        counts[fleetRow.status.key] = (counts[fleetRow.status.key] || 0) + 1
        return counts
      }, {}),
    [fleetRows],
  )
  const renderedRows = useProgressiveRows(visibleRows, 18, 18)

  const openVehicle = vehicle => {
    const existingStatement = (period.statements || []).find(
      statement => statement.vehicleId === vehicle.id,
    )
    if (existingStatement) {
      onOpen(existingStatement)
      return
    }

    const newStatement = createStatement(state, period, vehicleOf(state, vehicle.id))
    mutate(nextState => {
      const nextPeriod = nextState.periods.find(candidatePeriod => candidatePeriod.id === period.id)
      const alreadyExists = nextPeriod.statements.some(
        statement => statement.vehicleId === vehicle.id,
      )
      if (!alreadyExists) nextPeriod.statements.push(clone(newStatement))
    })
    onOpen(newStatement)
  }

  return (
    <div className="page">
      <PageHead
        title={periodMonthName(period)}
        subtitle={`${periodYear(period)} · ${fmtDate(period.start)} — ${fmtDate(period.end)} · контроль автопарка`}
        actions={<Button onClick={onExport}>Экспорт периода XLSX</Button>}
      />
      <div className="kpi-grid">
        <Kpi value={countsByStatus.ok || 0} label="готово" tone="ok" />
        <Kpi value={countsByStatus.warn || 0} label="с замечаниями" />
        <Kpi
          value={countsByStatus.bad || 0}
          label="с ошибками"
          tone={countsByStatus.bad ? 'bad' : undefined}
        />
        <Kpi value={countsByStatus.idle || 0} label="не ездили" tone="ok" />
        <Kpi value={(state.vehicles || []).length} label="всего машин" />
      </div>
      <Card>
        <div className="filters">
          <input
            className="input search"
            value={query}
            onChange={changeEvent => setQuery(changeEvent.target.value)}
            placeholder="Поиск по номеру, модели или рег. номеру…"
          />
          <select
            className="select"
            value={statusFilter}
            onChange={changeEvent => setStatusFilter(changeEvent.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="idle">Не ездили</option>
            <option value="bad">Ошибки</option>
            <option value="warn">Замечания</option>
            <option value="ok">Готово</option>
          </select>
        </div>
        <PeriodFleetTable rows={renderedRows} onHistory={onHistory} onOpenVehicle={openVehicle} />
      </Card>
    </div>
  )
}
