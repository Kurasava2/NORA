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
import { pluralRu, RU_FORMS } from '../lib/ru.js'
import PeriodFleetTable from './period/PeriodFleetTable.jsx'

const periodUiState = new Map()

function initialUiState(periodId) {
  return periodUiState.get(periodId) || { query: '', statusFilter: 'all' }
}

export default function PeriodView({ state, period, mutate, onOpen, onExport, onHistory }) {
  const initial = initialUiState(period.id)
  const [query, setQuery] = useState(initial.query)
  const [statusFilter, setStatusFilter] = useState(initial.statusFilter)
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

  const updateQuery = value => {
    setQuery(value)
    periodUiState.set(period.id, { query: value, statusFilter })
  }

  const updateStatusFilter = value => {
    setStatusFilter(value)
    periodUiState.set(period.id, { query, statusFilter: value })
  }

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

  const totalVehicles = (state.vehicles || []).length
  const readyCount = countsByStatus.ok || 0
  const warningCount = countsByStatus.warn || 0
  const errorCount = countsByStatus.bad || 0
  const idleCount = countsByStatus.idle || 0

  return (
    <div className="page">
      <PageHead
        title={periodMonthName(period)}
        subtitle={`${periodYear(period)} · ${fmtDate(period.start)} — ${fmtDate(period.end)}`}
        actions={<Button onClick={onExport}>Экспорт периода XLSX</Button>}
      />
      <div className="kpi-grid">
        <Kpi
          value={totalVehicles}
          label={pluralRu(totalVehicles, 'машина всего', 'машины всего', 'машин всего')}
        />
        <Kpi
          value={readyCount}
          label={pluralRu(readyCount, 'готова', 'готовы', 'готовы')}
          tone="ok"
        />
        <Kpi value={warningCount} label={pluralRu(warningCount, ...RU_FORMS.warning)} />
        <Kpi
          value={errorCount}
          label={pluralRu(errorCount, ...RU_FORMS.error)}
          tone={errorCount ? 'bad' : undefined}
        />
        <Kpi
          value={idleCount}
          label={pluralRu(idleCount, 'не ездила', 'не ездили', 'не ездили')}
          tone="ok"
        />
      </div>
      <Card>
        <div className="filters">
          <input
            className="input search"
            value={query}
            onChange={changeEvent => updateQuery(changeEvent.target.value)}
            placeholder="Поиск по номеру, модели или рег. номеру…"
          />
          <select
            className="select"
            value={statusFilter}
            onChange={changeEvent => updateStatusFilter(changeEvent.target.value)}
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
