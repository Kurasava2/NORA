import { unzip } from './archive.js'
import { workbookEntries } from './workbookEntries.js'
import { chooseSource, inspectionSummary } from './workbookSelection.js'
import { analyze } from './worksheetAnalysis.js'
import { sharedStrings } from './xml.js'

export { workbookEntries } from './workbookEntries.js'
export { analyze } from './worksheetAnalysis.js'
export { chooseSource } from './workbookSelection.js'

export function inspectFiles(files) {
  const sharedStringValues = sharedStrings(files)
  const analyses = workbookEntries(files).map(entry =>
    analyze(files, entry, sharedStringValues),
  )
  return inspectionSummary(analyses)
}

export async function inspect(bytes) {
  const files = await unzip(bytes)
  return inspectFiles(files)
}
