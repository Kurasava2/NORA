import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureTripListOrder,
  insertionListOrder,
  sortTripsInPlace,
} from '../src/lib/trips.js'

test('legacy trips keep their current date-number order when explicit ordering is initialized', () => {
  const trips = [
    { id: 'b', date: '2026-04-02', number: '20', seq: 2 },
    { id: 'a', date: '2026-04-01', number: '10', seq: 1 },
  ]
  ensureTripListOrder(trips)
  assert.deepEqual(trips.map(trip => trip.id), ['a', 'b'])
  assert.deepEqual(trips.map(trip => trip.listOrder), [0, 1])
})

test('new trip can be placed at the beginning or at the end independently of date', () => {
  const trips = [
    { id: 'a', date: '2026-04-01', number: '10', seq: 1 },
    { id: 'b', date: '2026-04-02', number: '20', seq: 2 },
  ]
  const startOrder = insertionListOrder(trips, 'start')
  const endOrder = insertionListOrder(trips, 'end')
  trips.push({ id: 'start', date: '2026-04-20', number: '99', listOrder: startOrder })
  trips.push({ id: 'end', date: '2026-03-01', number: '1', listOrder: endOrder })
  sortTripsInPlace(trips)
  assert.deepEqual(trips.map(trip => trip.id), ['start', 'a', 'b', 'end'])
})
