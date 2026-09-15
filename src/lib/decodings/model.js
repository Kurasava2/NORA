import { decodingId } from './id.js'
import { decodingSourceFingerprint } from './sourceSnapshot.js'

export const DECODING_FORM_63 = 'form63'

export const EMPTY_DECODING_STATE = {
  documents: [],
  densityLots: [],
  allocations: [],
  containers: [],
}

export function normalizeDecodingState(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    documents: Array.isArray(source.documents) ? source.documents : [],
    densityLots: Array.isArray(source.densityLots) ? source.densityLots : [],
    allocations: Array.isArray(source.allocations) ? source.allocations : [],
    containers: Array.isArray(source.containers) ? source.containers : [],
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

export function createDensityLot({ period, materialName, density, volume, date, sourceType, note }) {
  return {
    id: decodingId(),
    materialName,
    density: String(density || '').trim().replace(',', '.'),
    volumeLiters: String(volume || '').trim().replace(',', '.'),
    date: date || period.start,
    sourceType: sourceType || 'receipt',
    sourcePeriodId: period.id,
    note: String(note || '').trim(),
    createdAt: new Date().toISOString(),
  }
}
