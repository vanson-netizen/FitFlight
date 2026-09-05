const ENERGY_LEVELS = Object.freeze([
  { value: 'low', label: '偏低', score: 1 },
  { value: 'normal', label: '一般', score: 2 },
  { value: 'good', label: '良好', score: 3 }
])
const BODY_FEELINGS = Object.freeze([
  { value: 'normal', label: '正常' },
  { value: 'fatigued', label: '疲劳' },
  { value: 'sore', label: '酸痛' },
  { value: 'unwell', label: '不适' }
])
const TREND_METRICS = Object.freeze([
  { value: 'weightKg', label: '体重', unit: 'kg', chartType: 'line' },
  { value: 'sleepHours', label: '睡眠', unit: '小时', chartType: 'line' },
  { value: 'energyLevel', label: '精力', unit: '', chartType: 'bar' }
])
const TREND_RANGES = Object.freeze([
  { value: '7', label: '最近7天' },
  { value: '30', label: '最近30天' },
  { value: 'all', label: '全部' }
])
const HEALTH_PROMPT_RULES = Object.freeze({
  profileWeightChange: Object.freeze({ thresholdKg: 5, status: 'active' }),
  noticeableWeightChange: Object.freeze({ thresholdKg: 2, minimumRecords: 2, status: 'product_draft' })
})

module.exports = { ENERGY_LEVELS, BODY_FEELINGS, TREND_METRICS, TREND_RANGES, HEALTH_PROMPT_RULES }
