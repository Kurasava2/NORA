export function compareTrips(a, b) {
  return String(a?.date || '').localeCompare(String(b?.date || ''))
    || (Number(a?.number) || 0) - (Number(b?.number) || 0)
    || (Number(a?.seq) || 0) - (Number(b?.seq) || 0)
}

export function sortTripsInPlace(trips) {
  if (!Array.isArray(trips)) return []
  trips.sort(compareTrips)
  return trips
}
