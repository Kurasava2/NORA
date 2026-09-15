import React from 'react'

export default function SectionStep({ number, title, subtitle, children }) {
  return (
    <section className="entry-step">
      <div className="step-title">
        <span>{number}</span>
        <div>
          <b>{title}</b>
          <small>{subtitle}</small>
        </div>
      </div>
      {children}
    </section>
  )
}
