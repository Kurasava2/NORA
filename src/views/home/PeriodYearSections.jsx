import React from 'react'
import { Badge, Button, classNames } from '../../components/ui.jsx'
import { fmtDate, periodMonthName } from '../../lib/domain.js'
import { countForm, pluralRu, RU_FORMS } from '../../lib/ru.js'

export default function PeriodYearSections({
  groups,
  summaryById,
  onOpen,
  onDeletePeriod,
  onDeleteYear,
}) {
  return (
    <div className="year-sections year-sections-v141">
      {groups.map(([year, periods], yearIndex) => (
        <details
          className="year-section year-section-v141"
          key={year}
          defaultOpen={yearIndex === 0}
        >
          <summary className="year-summary-v141">
            <span className="year-chevron">›</span>
            <b>{year}</b>
            <small>{countForm(periods.length, RU_FORMS.month)}</small>
            <span className="year-summary-spacer" />
            <Button
              small
              danger
              onClick={clickEvent => {
                clickEvent.preventDefault()
                clickEvent.stopPropagation()
                onDeleteYear(year)
              }}
            >
              Удалить год
            </Button>
          </summary>
          <div className="period-list-v141">
            {periods.map(period => {
              const summary = summaryById.get(period.id)
              return (
                <div
                  key={period.id}
                  className={classNames('period-row-v141', summary.errors && 'has-errors')}
                >
                  <button className="period-row-main-v141" onClick={() => onOpen(period.id)}>
                    <span className="period-row-month-v141">
                      {periodMonthName(period)} {year}
                    </span>
                    <span className="period-row-range-v141">
                      {fmtDate(period.start)} — {fmtDate(period.end)}
                    </span>
                    <span className="period-row-stat-v141">
                      <b>{summary.drove}</b> {pluralRu(summary.drove, ...RU_FORMS.vehicle)} с выездом
                    </span>
                    <span className="period-row-stat-v141">
                      <b>{summary.stood}</b> {pluralRu(summary.stood, ...RU_FORMS.vehicle)} без выезда
                    </span>
                    <span className="period-row-status-v141">
                      {summary.errors ? (
                        <Badge tone="bad">{countForm(summary.errors, RU_FORMS.error)}</Badge>
                      ) : (
                        <Badge tone="ok">Готово</Badge>
                      )}
                    </span>
                    <span className="period-row-arrow-v141">›</span>
                  </button>
                  <Button small danger onClick={() => onDeletePeriod(period.id)}>Удалить</Button>
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}
