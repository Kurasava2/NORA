import {
  ALLOC_MINIMIZE,
  ALLOC_NONE,
  ALLOC_PRIORITY,
  ALLOC_PROPORTIONAL,
} from '../../lib/autoCalc.js'
import { RATE_PER_100KM } from '../../lib/vehicleMetrics.js'

export const EMPTY_VEHICLE_FORM = {
  shortNo: '',
  model: '',
  reg: '',
  baseRate: '',
  rateType: RATE_PER_100KM,
  tankCapacity: '',
  normText: '',
  hasMotohours: false,
  autoCalc: { enabled: true, params: [], rules: [] },
}

export const ALLOCATION_LABELS = {
  [ALLOC_MINIMIZE]: 'Минимизировать количество остатков',
  [ALLOC_PRIORITY]: 'Списывать по заданному приоритету',
  [ALLOC_PROPORTIONAL]: 'Пропорционально текущим остаткам',
  [ALLOC_NONE]: 'Только рассчитать общий расход',
}

export const deepClone = value => JSON.parse(JSON.stringify(value))
