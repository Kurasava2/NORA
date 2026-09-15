import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Kpi, PageHead } from '../components/ui.jsx'
import AllocationModal from '../modals/decoding/AllocationModal.jsx'
import DensityLotModal from '../modals/decoding/DensityLotModal.jsx'
import {
  autoAllocateMaterial,
  manualRowAllocations,
} from '../lib/decodings/allocations.js'
import {
  createDecodingDocument,
  createDensityLot,
  decodingDocument,
} from '../lib/decodings/model.js'
import { documentMaterials, documentStats } from '../lib/decodings/selectors.js'
import {
  buildDecodingSourceSnapshot,
  decodingSourceFingerprint,
} from '../lib/decodings/sourceSnapshot.js'
import { validateDecoding } from '../lib/decodings/validation.js'
import { periodDisplayName, sortedPeriods } from '../lib/domain.js'
import DecodingLots from './decodings/DecodingLots.jsx'
import DecodingMaterialCards from './decodings/DecodingMaterialCards.jsx'
import DecodingSourceTable from './decodings/DecodingSourceTable.jsx'

export default function DecodingsView({ state, mutate, notify, confirmAction }) {
  const periods = useMemo(() => sortedPeriods(state), [state])
  const [periodId, setPeriodId] = useState(periods[0]?.id || '')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [lotModalOpen, setLotModalOpen] = useState(false)
  const [allocationRow, setAllocationRow] = useState(null)
  const period = periods.find(candidatePeriod => candidatePeriod.id === periodId) || periods[0]
  const document = period ? decodingDocument(state, period.id) : null
  const validation = useMemo(
    () => validateDecoding(state.decoding, document, state.settings.tolerance),
    [state.decoding, document, state.settings.tolerance],
  )
  const materials = documentMaterials(document)
  const stats = documentStats(state.decoding, document, validation)

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
      nextState.decoding.documents.push(createDecodingDocument(period, snapshot))
    })
    notify('Расшифровка сформирована из автомобильных ведомостей.')
  }

  const refreshDocument = async () => {
    if (!period || !document) return
    const shouldRefresh = await confirmAction({
      title: 'Обновить данные из ведомостей?',
      message: 'Ручные распределения сохранятся, но после обновления потребуется повторная проверка.',
      confirmText: 'Обновить',
    })
    if (!shouldRefresh) return
    const snapshot = buildDecodingSourceSnapshot(state, period)
    mutate(nextState => {
      const nextDocument = nextState.decoding.documents.find(item => item.id === document.id)
      nextDocument.sourceSnapshot = snapshot
      nextDocument.sourceFingerprint = decodingSourceFingerprint(snapshot)
      nextDocument.updatedAt = new Date().toISOString()
    })
    notify('Источник расшифровки обновлён.')
  }

  const sourceStale = useMemo(() => {
    if (!period || !document) return false
    const liveSnapshot = buildDecodingSourceSnapshot(state, period)
    return decodingSourceFingerprint(liveSnapshot) !== document.sourceFingerprint
  }, [state, period, document])

  const addLot = lotForm => {
    mutate(nextState => {
      nextState.decoding.densityLots.push(
        createDensityLot({ period, materialName: selectedMaterial, ...lotForm }),
      )
    })
    setLotModalOpen(false)
    notify('Партия плотности добавлена.')
  }

  const runAuto = () => {
    if (!document || !selectedMaterial) return
    const result = autoAllocateMaterial(state.decoding, document, selectedMaterial)
    mutate(nextState => {
      nextState.decoding.allocations = result.allocations
    })
    notify(
      result.shortages.length
        ? `FIFO применён, но не хватило партий для ${result.shortages.length} строк.`
        : 'FIFO-распределение применено. Ручные строки сохранены.',
      Boolean(result.shortages.length),
    )
  }

  const saveManualAllocation = valuesByLot => {
    if (!document || !allocationRow) return
    const replacements = manualRowAllocations(document, allocationRow, valuesByLot)
    mutate(nextState => {
      nextState.decoding.allocations = nextState.decoding.allocations.filter(
        allocation =>
          allocation.decodingId !== document.id ||
          allocation.statementId !== allocationRow.statementId ||
          allocation.materialName !== allocationRow.materialName,
      )
      nextState.decoding.allocations.push(...replacements)
    })
    setAllocationRow(null)
    notify('Ручное распределение сохранено.')
  }

  return (
    <div className="page page-wide">
      <PageHead
        title="Расшифровки ГСМ"
        subtitle="Ведомость ведомостей · партии, плотности и переходящие остатки"
        actions={document && <Button onClick={refreshDocument}>Обновить из ведомостей</Button>}
      />
      <div className="decoding-toolbar">
        <select
          className="select"
          value={period?.id || ''}
          onChange={event => setPeriodId(event.target.value)}
        >
          {periods.map(item => (
            <option key={item.id} value={item.id}>{periodDisplayName(item)}</option>
          ))}
        </select>
        {!document && (
          <Button primary onClick={createDocument} disabled={!period}>
            Сформировать из ведомостей
          </Button>
        )}
        {sourceStale && <Badge tone="warn">ведомости изменены</Badge>}
      </div>
      {document && (
        <>
          <div className="kpi-grid">
            <Kpi value={stats.machines} label="машин" />
            <Kpi value={stats.materials} label="видов ГСМ" />
            <Kpi value={stats.densities} label="плотностей" />
            <Kpi value={stats.errors} label="ошибок" tone={stats.errors ? 'bad' : 'ok'} />
          </div>
          <DecodingMaterialCards
            decodingState={state.decoding}
            document={document}
            selected={selectedMaterial}
            onSelect={setSelectedMaterial}
          />
          {selectedMaterial && (
            <div className="decoding-workspace">
              <div className="decoding-actions">
                <Button primary onClick={runAuto}>Распределить автоматически FIFO</Button>
                <Button onClick={() => setLotModalOpen(true)}>＋ Добавить партию</Button>
              </div>
              <DecodingLots
                decodingState={state.decoding}
                materialName={selectedMaterial}
                onAddLot={() => setLotModalOpen(true)}
              />
              <DecodingSourceTable
                decodingState={state.decoding}
                document={document}
                materialName={selectedMaterial}
                onEdit={setAllocationRow}
              />
            </div>
          )}
          {!!validation.errors.length && (
            <div className="form-errors decoding-errors">
              {validation.errors.slice(0, 12).map(error => <div key={error}>{error}</div>)}
            </div>
          )}
        </>
      )}
      {!document && period && (
        <div className="empty decoding-empty">
          <b>Расшифровка ещё не создана</b>
          <span>
            Сформируйте её из уже заполненных автомобильных ведомостей за {periodDisplayName(period)}.
          </span>
        </div>
      )}
      <DensityLotModal
        open={lotModalOpen}
        onClose={() => setLotModalOpen(false)}
        period={period}
        materialName={selectedMaterial}
        onSave={addLot}
        notify={notify}
      />
      <AllocationModal
        open={Boolean(allocationRow)}
        onClose={() => setAllocationRow(null)}
        decodingState={state.decoding}
        document={document}
        row={allocationRow}
        onSave={saveManualAllocation}
      />
    </div>
  )
}
