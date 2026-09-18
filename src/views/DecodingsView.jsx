import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Kpi, PageHead } from '../components/ui.jsx'
import DensityMovementModal from '../modals/decoding/DensityMovementModal.jsx'
import { replaceCarryMovements } from '../lib/decodings/balances.js'
import { createDecodingDocument, decodingDocument } from '../lib/decodings/model.js'
import { documentMaterials, documentStats, materialSourceRows } from '../lib/decodings/selectors.js'
import { buildDecodingSourceSnapshot, decodingSourceFingerprint } from '../lib/decodings/sourceSnapshot.js'
import { validateDecoding } from '../lib/decodings/validation.js'
import { periodDisplayName, sortedPeriods } from '../lib/domain.js'
import DecodingDensityTable from './decodings/DecodingDensityTable.jsx'
import DecodingMaterialCards from './decodings/DecodingMaterialCards.jsx'
import DecodingMovements from './decodings/DecodingMovements.jsx'
import DecodingSourceTable from './decodings/DecodingSourceTable.jsx'
import useDensityMovementEditor from './decodings/useDensityMovementEditor.js'

export default function DecodingsView({ state, mutate, notify, confirmAction }) {
  const periods = useMemo(() => sortedPeriods(state), [state])
  const [periodId, setPeriodId] = useState(periods[0]?.id || '')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const period = periods.find(candidatePeriod => candidatePeriod.id === periodId) || periods[0]
  const document = period ? decodingDocument(state, period.id) : null
  const materials = documentMaterials(document)
  const validation = useMemo(
    () => validateDecoding(state.decoding, document, state.settings.tolerance),
    [state.decoding, document, state.settings.tolerance],
  )
  const stats = documentStats(state.decoding, document, validation)
  const sourceRows = materialSourceRows(document, selectedMaterial)
  const movementEditor = useDensityMovementEditor({
    period, document, materialName: selectedMaterial, mutate, notify, confirmAction,
  })

  useEffect(() => {
    if (!period && periods[0]) setPeriodId(periods[0].id)
  }, [period, periods])

  useEffect(() => {
    if (!materials.includes(selectedMaterial)) setSelectedMaterial(materials[0] || '')
  }, [materials, selectedMaterial])

  const createDocument = () => {
    if (!period) return
    const snapshot = buildDecodingSourceSnapshot(state, period)
    mutate(nextState => {
      const nextDocument = createDecodingDocument(period, snapshot)
      nextState.decoding.documents.push(nextDocument)
      replaceCarryMovements(nextState.decoding, nextDocument)
    })
    notify('Расшифровка сформирована. Перенос плотностей взят из предыдущего периода.')
  }

  const refreshDocument = async () => {
    if (!period || !document) return
    const shouldRefresh = await confirmAction({
      title: 'Обновить данные из ведомостей?',
      message: 'Получения по раздаточной сохранятся. После обновления нажмите «Пересчитать расход».',
      confirmText: 'Обновить',
    })
    if (!shouldRefresh) return
    const snapshot = buildDecodingSourceSnapshot(state, period)
    mutate(nextState => {
      const nextDocument = nextState.decoding.documents.find(item => item.id === document.id)
      nextDocument.sourceSnapshot = snapshot
      nextDocument.sourceFingerprint = decodingSourceFingerprint(snapshot)
      nextDocument.updatedAt = new Date().toISOString()
      nextState.decoding.allocations = nextState.decoding.allocations.filter(
        allocation => allocation.decodingId !== document.id || allocation.source === 'manual',
      )
      replaceCarryMovements(nextState.decoding, nextDocument)
    })
    notify('Ведомости и перенос плотностей обновлены.')
  }

  const sourceStale = useMemo(() => {
    if (!period || !document) return false
    const liveSnapshot = buildDecodingSourceSnapshot(state, period)
    return decodingSourceFingerprint(liveSnapshot) !== document.sourceFingerprint
  }, [state, period, document])

  return (
    <div className="page page-wide">
      <PageHead
        title="Расшифровки ГСМ"
        subtitle="Форма №63 · раздаточная ведомость → плотности → литры и килограммы"
        actions={document && <Button onClick={refreshDocument}>Обновить из ведомостей</Button>}
      />
      <div className="decoding-toolbar">
        <select className="select" value={period?.id || ''} onChange={event => setPeriodId(event.target.value)}>
          {periods.map(item => <option key={item.id} value={item.id}>{periodDisplayName(item)}</option>)}
        </select>
        {!document && <Button primary onClick={createDocument} disabled={!period}>Сформировать расшифровку</Button>}
        {sourceStale && <Badge tone="warn">ведомости изменены</Badge>}
      </div>
      {document && (
        <>
          <div className="kpi-grid">
            <Kpi value={stats.machines} label="машин" />
            <Kpi value={stats.materials} label="видов ГСМ" />
            <Kpi value={stats.densities} label="плотностей" />
            <Kpi value={stats.errors} label="несовпадений" tone={stats.errors ? 'bad' : 'ok'} />
          </div>
          <DecodingMaterialCards decodingState={state.decoding} document={document} selected={selectedMaterial} onSelect={setSelectedMaterial} />
          {selectedMaterial && (
            <div className="decoding-workspace">
              <div className="decoding-actions">
                <Button primary onClick={movementEditor.runAuto}>Пересчитать расход</Button>
                <Button onClick={movementEditor.openNew}>＋ Запись раздаточной</Button>
              </div>
              <DecodingMovements
                decodingState={state.decoding}
                document={document}
                materialName={selectedMaterial}
                sourceRows={sourceRows}
                onAdd={movementEditor.openNew}
                onEdit={movementEditor.openEdit}
                onDelete={movementEditor.remove}
              />
              <DecodingSourceTable decodingState={state.decoding} document={document} materialName={selectedMaterial} />
              <DecodingDensityTable decodingState={state.decoding} document={document} materialName={selectedMaterial} />
            </div>
          )}
          {!!validation.errors.length && (
            <div className="form-errors decoding-errors">{validation.errors.slice(0, 16).map(error => <div key={error}>{error}</div>)}</div>
          )}
          {!!validation.warnings.length && (
            <div className="form-warnings decoding-errors">{validation.warnings.map(warning => <div key={warning}>{warning}</div>)}</div>
          )}
        </>
      )}
      {!document && period && <div className="empty decoding-empty"><b>Расшифровка ещё не создана</b><span>Сформируйте её из автомобильных ведомостей за {periodDisplayName(period)}.</span></div>}
      <DensityMovementModal
        open={movementEditor.open}
        onClose={movementEditor.close}
        period={period}
        materialName={selectedMaterial}
        sourceRows={sourceRows}
        movement={movementEditor.editingMovement}
        onSave={movementEditor.save}
        notify={notify}
      />
    </div>
  )
}
