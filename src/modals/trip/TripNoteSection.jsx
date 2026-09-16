import React from 'react'
import SectionStep from './SectionStep.jsx'

export default function TripNoteSection({ stepNumber, value, onChange }) {
  return (
    <SectionStep number={String(stepNumber)} title="Примечание" subtitle="необязательно">
      <textarea className="textarea" value={value || ''} onChange={event => onChange(event.target.value)} />
    </SectionStep>
  )
}
