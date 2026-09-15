import React, { useEffect, useState } from 'react'
import { Button, Card, PageHead } from '../components/ui.jsx'

export default function PreviewView({ vehicle, onBack, onExport, onPrint, getPreviewHtml }) {
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPreviewError('')

    getPreviewHtml()
      .then(html => {
        if (!cancelled) setPreviewHtml(html)
      })
      .catch(error => {
        if (!cancelled) setPreviewError(error?.message || String(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getPreviewHtml])

  return (
    <div className="page page-wide">
      <PageHead
        title="Предпросмотр ведомости"
        subtitle={`${vehicle.model} · ${vehicle.shortNo} · предпросмотр строится из того же Excel-шаблона, что и XLSX`}
        actions={(
          <>
            <Button onClick={onBack}>← Назад</Button>
            <Button onClick={onExport}>XLSX</Button>
            <Button primary onClick={onPrint}>Печать</Button>
          </>
        )}
      />
      {loading ? (
        <Card className="preview-state">Формируется предпросмотр из Excel-шаблона…</Card>
      ) : previewError ? (
        <Card className="preview-state preview-error">{previewError}</Card>
      ) : (
        <div
          className="paper-preview template-preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  )
}
