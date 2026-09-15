import React, { useDeferredValue, useMemo, useState } from 'react'
import { Button, Card, PageHead } from '../components/ui.jsx'
import useProgressiveRows from '../hooks/useProgressiveRows.js'
import { nfmt, vehicleOf, vehicleRateLabel } from '../lib/domain.js'
import { countForm, RU_FORMS } from '../lib/ru.js'

export default function VehiclesView({
  state,
  mutate,
  onHistory,
  onAdd,
  onEdit,
  notify,
  confirmAction,
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const allVehicles = useMemo(
    () => (state.vehicles || []).map(vehicle => vehicleOf(state, vehicle.id)).filter(Boolean),
    [state.vehicles, state.vehicleSettings],
  )
  const visibleVehicles = useMemo(() => {
    const searchText = deferredQuery.toLowerCase().trim()
    if (!searchText) return allVehicles
    return allVehicles.filter(vehicle =>
      `${vehicle.shortNo} ${vehicle.model} ${vehicle.reg}`.toLowerCase().includes(searchText),
    )
  }, [allVehicles, deferredQuery])
  const renderedVehicles = useProgressiveRows(visibleVehicles, 20, 20)

  const removeVehicle = async vehicle => {
    const statementCount = state.periods.reduce(
      (totalStatements, period) =>
        totalStatements +
        (period.statements || []).filter(statement => statement.vehicleId === vehicle.id).length,
      0,
    )
    const shouldDelete = await confirmAction({
      title: 'Удалить автомобиль?',
      message: `${vehicle.model} · ${vehicle.shortNo} будет удалён из справочника.${
        statementCount
          ? ` Также будут удалены ${countForm(statementCount, RU_FORMS.statement)} этой машины.`
          : ''
      }`,
      confirmText: 'Удалить автомобиль',
      danger: true,
    })
    if (!shouldDelete) return

    mutate(nextState => {
      nextState.vehicles = (nextState.vehicles || []).filter(
        candidateVehicle => candidateVehicle.id !== vehicle.id,
      )
      delete nextState.vehicleSettings?.[vehicle.id]
      for (const period of nextState.periods) {
        period.statements = (period.statements || []).filter(
          statement => statement.vehicleId !== vehicle.id,
        )
      }
    })
    notify('Автомобиль удалён')
  }

  return (
    <div className="page">
      <PageHead
        title="Автомобили"
        subtitle={`${countForm(allVehicles.length, RU_FORMS.vehicle)} в справочнике`}
        actions={<Button primary onClick={onAdd}>＋ Добавить автомобиль</Button>}
      />
      <Card>
        <div className="filters">
          <input
            className="input search"
            placeholder="Поиск машины…"
            value={query}
            onChange={changeEvent => setQuery(changeEvent.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table className="data-table vehicle-table">
            <thead>
              <tr><th>№</th><th>Модель</th><th>Рег. №</th><th>Норма</th><th>Бак</th><th>ГСМ</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {renderedVehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td><b className="mono-lg">{vehicle.shortNo}</b></td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.reg}</td>
                  <td>{vehicle.baseRate ? vehicleRateLabel(vehicle) : '—'}</td>
                  <td>{vehicle.tankCapacity ? `${nfmt(vehicle.tankCapacity)} л` : '—'}</td>
                  <td className="muted">выбирается в путёвке</td>
                  <td className="actions-cell">
                    <div className="row-actions">
                      <Button small onClick={() => onHistory(vehicle.id)}>История</Button>
                      <Button small onClick={() => onEdit(vehicle)}>Изменить</Button>
                      <Button small danger onClick={() => removeVehicle(vehicle)}>Удалить</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
