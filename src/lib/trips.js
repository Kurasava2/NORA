function legacyTripOrder(firstTrip, secondTrip) {
  return (
    String(firstTrip?.date || '').localeCompare(String(secondTrip?.date || '')) ||
    (Number(firstTrip?.number) || 0) - (Number(secondTrip?.number) || 0) ||
    (Number(firstTrip?.seq) || 0) - (Number(secondTrip?.seq) || 0)
  )
}

function explicitListOrder(trip) {
  if (trip?.listOrder === '' || trip?.listOrder == null) return null
  const value = Number(trip.listOrder)
  return Number.isFinite(value) ? value : null
}

export function compareTrips(firstTrip, secondTrip) {
  const firstOrder = explicitListOrder(firstTrip)
  const secondOrder = explicitListOrder(secondTrip)

  if (firstOrder !== null && secondOrder !== null && firstOrder !== secondOrder) {
    return firstOrder - secondOrder
  }
  return legacyTripOrder(firstTrip, secondTrip)
}

export function sortTripsInPlace(trips) {
  if (!Array.isArray(trips)) return []
  trips.sort(compareTrips)
  return trips
}

export function ensureTripListOrder(trips) {
  if (!Array.isArray(trips)) return []
  sortTripsInPlace(trips)
  const allOrdered = trips.every(trip => explicitListOrder(trip) !== null)
  if (!allOrdered) trips.forEach((trip, index) => { trip.listOrder = index })
  return trips
}

export function insertionListOrder(trips, position = 'end') {
  ensureTripListOrder(trips)
  if (!trips.length) return 0
  const orders = trips.map(trip => explicitListOrder(trip) ?? 0)
  return position === 'start' ? Math.min(...orders) - 1 : Math.max(...orders) + 1
}
