import { motohoursWorked, num } from '../../lib/domain.js'

export default function tripMetrics(form, vehicle) {
  const odometerStart = num(form.odoStart)
  const odometerEnd = num(form.odoEnd)
  const motohoursStart = num(form.motohoursStart)
  const motohoursEnd = num(form.motohoursEnd)

  return {
    mileage:
      odometerStart !== null && odometerEnd !== null ? odometerEnd - odometerStart : null,
    workedMotohours: motohoursWorked(form),
    legacyMotohours:
      vehicle.hasMotohours &&
      motohoursStart === null &&
      motohoursEnd === null &&
      num(form.motohours) !== null,
  }
}
