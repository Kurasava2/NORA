import { decodingId } from './id.js'
import { decimalCanonical } from './decimal.js'
import { decodingSourceFingerprint } from './sourceSnapshot.js'

export const DECODING_FORM_63 = 'form63'
export const DENSITY_ENTRY_OPENING = 'opening'
export const DENSITY_ENTRY_RECEIPT = 'receipt'
export const DENSITY_ENTRY_SPENT = 'spent'
export const DENSITY_ENTRY_SURRENDERED = 'surrendered'

const EMPTY_LEGACY = { densityLots: [], allocations: [] }

export const EMPTY_DECODING_STATE = {
  documents: [],
  entries: [],
  containers: [],
  legacy: EMPTY_LEGACY,
}

function arrayOf(value) {
  return Array.isArray(value) ? value : []
}

export function normalizeDecodingState(value) {
  const source = value && typeof value === 'object' ? value : {}
  const legacy = source.legacy && typeof source.legacy === 'object' ? source.legacy : {}
  return {
    documents: arrayOf(source.documents),
    entries: arrayOf(source.entries),
    containers: arrayOf(source.containers),
    legacy: {
      densityLots: arrayOf(legacy.densityLots).length
        ? arrayOf(legacy.densityLots)
        : arrayOf(source.densityLots),
      allocations: arrayOf(legacy.allocations).length
        ? arrayOf(legacy.allocations)
        : arrayOf(source.allocations),
    },
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

export function createDensityEntry({
  period,
  kind,
  vehicleId,
  statementId,
  tripId,
  waybillNumber,
  date,
  materialName,
  density,
  liters,
  note,
}) {
  const now = new Date().toISOString()
  return {
    id: decodingId(),
    periodId: period.id,
    kind,
    vehicleId: String(vehicleId || ''),
    statementId: String(statementId || ''),
    tripId: String(tripId || ''),
    waybillNumber: String(waybillNumber || '').trim(),
    date: date || period.start,
    materialName: String(materialName || ''),
    density: decimalCanonical(density, ''),
    liters: decimalCanonical(liters, '0'),
    note: String(note || '').trim(),
    createdAt: now,
    updatedAt: now,
  }
}
