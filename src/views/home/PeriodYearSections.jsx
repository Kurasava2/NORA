import React from 'react'
import { Badge, Button, classNames } from '../../components/ui.jsx'
import { fmtDate, periodMonthName } from '../../lib/domain.js'
import { countForm, pluralRu, RU_FORMS } from '../../lib/ru.js'

const periodRowButtonClasses = [
  'grid min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-[11px] text-left text-inherit',
  'grid-cols-[minmax(150px,1.25fr)_minmax(170px,1.2fr)_minmax(130px,1fr)_minmax(150px,1fr)_minmax(105px,0.7fr)_22px]',
  'max-[1180px]:grid-cols-[1.25fr_1.1fr_0.9fr_0.9fr_100px_18px] max-[1180px]:gap-2',
  'max-[930px]:grid-cols-[1.2fr_1fr_100px_18px]',
].join(' ')

const periodStatClasses =
  'whitespace-nowrap text-[11px] text-gray-400 max-[1180px]:whitespace-normal max-[930px]:hidden'

export default function PeriodYearSections({
  groups,
  summaryById,
  onOpen,
  onDeletePeriod,
  onDeleteYear,
}) {
  return (
    <div className="grid gap-3">
      {groups.map(([year, periods], yearIndex) => (
        <details
          className="group overflow-hidden rounded-xl border border-[#263244] bg-[#0a101b]"
          key={year}
          defaultOpen={yearIndex === 0}
        >
          <summary className="flex min-h-[52px] cursor-pointer list-none select-none items-center gap-2.5 border-b border-transparent bg-[#111927] px-3 py-2 group-open:border-[#263244] [&::-webkit-details-marker]:hidden">
            <span className="grid h-[22px] w-[22px] place-items-center text-[22px] leading-none text-gray-400 transition-transform duration-[120ms] group-open:rotate-90 [.performance-mode_&]:transition-none">
              ›
            </span>
            <b className="text-lg tracking-[.02em] text-gray-100">{year}</b>
            <small className="text-[11.5px] text-gray-400">
              {countForm(periods.length, RU_FORMS.month)}
            </small>
            <span className="flex-1" />
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
          <div className="grid gap-[5px] p-2">
            {periods.map(period => {
              const summary = summaryById.get(period.id)
              return (
                <div
                  key={period.id}
                  className={classNames(
                    'flex items-center gap-2 rounded-[9px] border border-transparent hover:border-[#2f3c51] hover:bg-[#111a29]',
                    summary.errors && 'border-l-[3px] !border-l-red-500',
                  )}
                >
                  <button className={periodRowButtonClasses} onClick={() => onOpen(period.id)}>
                    <span className="text-[13px] font-bold text-gray-100">
                      {periodMonthName(period)} {year}
                    </span>
                    <span className="text-[11.5px] text-[#aeb8c7]">
                      {fmtDate(period.start)} — {fmtDate(period.end)}
                    </span>
                    <span className={periodStatClasses}>
                      <b className="text-xs text-gray-200">{summary.drove}</b>{' '}
                      {pluralRu(summary.drove, ...RU_FORMS.vehicle)} с выездом
                    </span>
                    <span className={periodStatClasses}>
                      <b className="text-xs text-gray-200">{summary.stood}</b>{' '}
                      {pluralRu(summary.stood, ...RU_FORMS.vehicle)} без выезда
                    </span>
                    <span className="flex justify-center">
                      {summary.errors ? (
                        <Badge tone="bad">{countForm(summary.errors, RU_FORMS.error)}</Badge>
                      ) : (
                        <Badge tone="ok">Готово</Badge>
                      )}
                    </span>
                    <span className="text-right text-[22px] text-[#7c8ba1]">›</span>
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
