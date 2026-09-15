import { tripBelongsToPeriod } from '../../periodImport.js'
import { unzip } from '../archive.js'
import { analyze, workbookEntries } from '../workbookAnalysis.js'
import { sharedStrings } from '../xml.js'
import { periodFromTitle } from './dateParsing.js'
import { matKey } from './materialParsing.js'
import { cellRef, parseNativeSheet, vehicleForSheet } from './sheetParsing.js'

function detectPeriod(analyses, sharedStringValues) {
  const periodHits = new Map()

  for (const analysis of analyses) {
    const title = cellRef(analysis.doc, 'A1', sharedStringValues)
    const period = periodFromTitle(title)
    if (!period) continue

    const periodKey = JSON.stringify(period)
    periodHits.set(periodKey, (periodHits.get(periodKey) || 0) + 1)
  }

  const bestPeriod = [...periodHits.entries()].sort(
    (leftEntry, rightEntry) => rightEntry[1] - leftEntry[1],
  )[0]
  if (!bestPeriod) {
    throw new Error('Не удалось определить расчётный период из заголовков листов.')
  }
  return JSON.parse(bestPeriod[0])
}

function catalogMaterialKeys(catalog) {
  return new Set(
    (catalog || []).flatMap(material =>
      [material.name, ...(material.aliases || [])].map(matKey),
    ),
  )
}

export async function importMonth(templateBytes, vehicles, catalog) {
  const files = await unzip(templateBytes)
  const sharedStringValues = sharedStrings(files)
  const analyses = workbookEntries(files).map(entry =>
    analyze(files, entry, sharedStringValues),
  )
  const period = detectPeriod(analyses, sharedStringValues)
  const knownMaterialKeys = catalogMaterialKeys(catalog)
  const unknownMaterials = new Set()
  const statements = []
  const ignored = []
  let recognized = 0
  let totalTrips = 0
  let skippedOutOfPeriod = 0

  for (const analysis of analyses) {
    const vehicle = vehicleForSheet(analysis, vehicles, sharedStringValues)
    if (!vehicle) {
      ignored.push(analysis.name)
      continue
    }

    recognized += 1
    const parsedTrips = parseNativeSheet(
      analysis,
      sharedStringValues,
      vehicle,
      catalog,
      new Set(),
    )
    const trips = parsedTrips.filter(trip => tripBelongsToPeriod(trip, period))
    skippedOutOfPeriod += parsedTrips.length - trips.length

    if (!trips.length) continue

    for (const trip of trips) {
      for (const materialName of Object.keys(trip.gsm || {})) {
        if (!knownMaterialKeys.has(matKey(materialName))) {
          unknownMaterials.add(materialName)
        }
      }
    }

    statements.push({
      vehicleId: vehicle.id,
      sourceSheet: analysis.name,
      trips,
    })
    totalTrips += trips.length
  }

  return {
    period,
    statements,
    recognized,
    totalSheets: analyses.length,
    totalTrips,
    skippedOutOfPeriod,
    ignored,
    unknownMaterials: [...unknownMaterials],
  }
}
