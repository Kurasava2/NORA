import React, { useMemo, useState } from 'react'
import { Badge, Button, Card, PageHead } from '../components/ui.jsx'
import { BalancePanel, CarryPanel, CheckPanel, TripTable } from '../components/statement.jsx'
import TripModal from '../modals/TripModal.jsx'
import {
  fmtDate,
  periodMonthName,
  periodName,
  periodYear,
  reconcileCarryForward,
  statementStatus,
  totals,
} from '../lib/domain.js'
import { countForm, RU_FORMS } from '../lib/ru.js'
import StatementSummaryStrip from './statement/StatementSummaryStrip.jsx'
import useStatementCarry from './statement/useStatementCarry.js'

const CLOSED_EDITOR = { open: false, trip: null }

export default function StatementView({
  state,
  period,
  statement,
  vehicle,
  mutate,
  onBack,
  onHistory,
  onPreview,
  onExport,
  onPrint,
  notify,
  confirmAction,
}) {
  const [editor, setEditor] = useState(CLOSED_EDITOR)
  const status = useMemo(
    () => statementStatus(state, statement, period),
    [state, statement, period],
  )
  const statementTotals = useMemo(() => totals(statement), [statement])
  const refreshCarry = useStatementCarry({ state, period, statement, mutate, notify })

  const deleteTripFromList = async trip => {
    const shouldDelete = await confirmAction({
      title: 'Удалить путёвку?',
      message: `Путёвка №${trip.number || '—'} от ${fmtDate(trip.date)} будет удалена.`,
      confirmText: 'Удалить',
      danger: true,
    })
    if (!shouldDelete) return

    mutate(nextState => {
      const nextPeriod = nextState.periods.find(candidatePeriod => candidatePeriod.id === period.id)
      const nextStatement = nextPeriod.statements.find(
        candidateStatement => candidateStatement.id === statement.id,
      )
      nextStatement.trips = nextStatement.trips.filter(
        candidateTrip => candidateTrip.id !== trip.id,
      )
      reconcileCarryForward(nextState, nextStatement)
    })
    notify('Путёвка удалена')
  }

  return (
    <div className="page page-wide">
      <PageHead
        title={`${vehicle.model} · ${vehicle.shortNo}`}
        subtitle={`№ ${vehicle.reg} · ${periodMonthName(period)} ${periodYear(period)} · ${periodName(period)}`}
        actions={(
          <>
            <Button icon onClick={onBack} title="Назад" aria-label="Назад">←</Button>
            <Button onClick={onHistory}>История</Button>
            <Button onClick={onPreview}>Предпросмотр</Button>
            <Button onClick={onExport}>XLSX</Button>
            <Button primary onClick={onPrint}>Печать</Button>
          </>
        )}
      />
      <StatementSummaryStrip statement={statement} vehicle={vehicle} status={status} />
      <div className="workspace">
        <div className="workspace-main">
          <Card>
            <div className="section-heading">
              <div>
                <h3>Внесённые путёвки</h3>
                <p>Нажмите строку, чтобы отредактировать. Новая путёвка открывается отдельным окном.</p>
              </div>
              <div className="section-actions">
                <Badge tone="blue">{countForm(statement.trips.length, RU_FORMS.trip)}</Badge>
                <Button primary onClick={() => setEditor({ open: true, trip: null })}>
                  ＋ Добавить путёвку
                </Button>
              </div>
            </div>
            <TripTable
              state={state}
              period={period}
              statement={statement}
              vehicle={vehicle}
              onEdit={trip => setEditor({ open: true, trip })}
              onDelete={deleteTripFromList}
            />
          </Card>
          <BalancePanel statement={statement} total={statementTotals} />
        </div>
        <aside className="workspace-side">
          <CheckPanel status={status} />
          <CarryPanel statement={statement} onRefresh={refreshCarry} />
        </aside>
      </div>
      <TripModal
        open={editor.open}
        trip={editor.trip}
        onClose={() => setEditor(CLOSED_EDITOR)}
        state={state}
        period={period}
        statement={statement}
        vehicle={vehicle}
        mutate={mutate}
        notify={notify}
        confirmAction={confirmAction}
      />
    </div>
  )
}
