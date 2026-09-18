import { decodingId } from './id.js'
import { decodingSourceFingerprint } from './sourceSnapshot.js'

export const DECODING_FORM_63 = 'form63'
export const MOVEMENT_OPENING = 'opening'
export const MOVEMENT_CARRY = 'carry'
export const MOVEMENT_RECEIPT = 'receipt'
export const MOVEMENT_SURRENDERED = 'surrendered'

export const EMPTY_DECODING_STATE = {
  documents: [],
  densityMovements: [],
  allocations: [],
  containers: [],
  legacyDensityLots: [],
  legacyAllocations: [],
}

export function normalizeDecodingState(value) {
  const source = value && typeof value === 'object' ? value : {}
  const allocations = Array.isArray(source.allocations) ? source.allocations : []
  const currentAllocations = allocations.filter(allocation => allocation?.density)
  const oldAllocations = allocations.filter(allocation => !allocation?.density)

  return {
    documents: Array.isArray(source.documents) ? source.documents : [],
    densityMovements: Array.isArray(source.densityMovements) ? source.densityMovements : [],
    allocations: currentAllocations,
    containers: Array.isArray(source.containers) ? source.containers : [],
    legacyDensityLots: [
      ...(Array.isArray(source.legacyDensityLots) ? source.legacyDensityLots : []),
      ...(Array.isArray(source.densityLots) ? source.densityLots : []),
    ],
    legacyAllocations: [
      ...(Array.isArray(source.legacyAllocations) ? source.legacyAllocations : []),
      ...oldAllocations,
    ],
  }
}

export function decodingDocument(state, periodId, mode = DECODING_FORM_63) {
  return (state?.decoding?.documents || []).find(
    document => document.periodId === periodId && document.mode === mode,
  ) || null
}

export function createDecodingDocument(period, snapshot, mode = DECODING_FORM_63) {
  const now = new Date().toISOString()
  return {
    id: decodingId(),
    periodId: period.id,
    mode,
    createdAt: now,
    updatedAt: now,
    sourceFingerprint: decodingSourceFingerprint(snapshot),
    sourceSnapshot: snapshot,
    status: 'draft',
    finalizedAt: null,
  }
}

export function createDensityMovement({
  period,
  vehicleId,
  materialName,
  density,
  liters,
  date,
  waybillNumber,
  kind = MOVEMENT_RECEIPT,
  note,
  generated = false,
  sourcePeriodId = null,
  id = decodingId(),
  createdAt = new Date().toISOString(),
}) {
  return {
    id,
    periodId: period.id,
    vehicleId,
    materialName,
    density: String(density || '').trim().replace(',', '.'),
    liters: String(liters || '').trim().replace(',', '.'),
    date: date || period.start,
    waybillNumber: String(waybillNumber || '').trim(),
    kind,
    note: String(note || '').trim(),
    generated: Boolean(generated),
    sourcePeriodId,
    createdAt,
  }
}
