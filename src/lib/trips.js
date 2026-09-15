export function compareTrips(firstTrip, secondTrip) {
  return (
    String(firstTrip?.date || '').localeCompare(String(secondTrip?.date || '')) ||
    (Number(firstTrip?.number) || 0) - (Number(secondTrip?.number) || 0) ||
    (Number(firstTrip?.seq) || 0) - (Number(secondTrip?.seq) || 0)
  )
}

export function sortTripsInPlace(trips) {
  if (!Array.isArray(trips)) return []
  trips.sort(compareTrips)
  return trips
}
