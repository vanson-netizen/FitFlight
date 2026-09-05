const { ENERGY_LEVELS, HEALTH_PROMPT_RULES } = require('../constants/health-record')

function shiftDateKey(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function filterByRange(records, range, todayKey) {
  const sorted = records.slice().filter((record) => record && record.recordDate <= todayKey).sort((a, b) => a.recordDate.localeCompare(b.recordDate))
  if (range === 'all') return sorted
  const days = Number(range)
  const start = shiftDateKey(todayKey, -(days - 1))
  return sorted.filter((record) => record.recordDate >= start)
}

function metricValue(record, metric) {
  if (metric === 'energyLevel') {
    const item = ENERGY_LEVELS.find((level) => level.value === record.energyLevel)
    return item ? item.score : null
  }
  const value = Number(record[metric])
  return Number.isFinite(value) ? value : null
}

function buildTrend(records, metric, range, todayKey) {
  const points = filterByRange(records, range, todayKey).map((record) => ({ date: record.recordDate, value: metricValue(record, metric) })).filter((point) => point.value !== null)
  if (points.length < 2) return { status: 'insufficient', points, change: null, min: null, max: null }
  const values = points.map((point) => point.value)
  return { status: 'ready', points, change: Number((values[values.length - 1] - values[0]).toFixed(1)), min: Math.min(...values), max: Math.max(...values) }
}

function evaluateHealthPrompts(records, profileSnapshot = null) {
  const weightRecords = records.filter((record) => Number.isFinite(Number(record.weightKg))).sort((a, b) => a.recordDate.localeCompare(b.recordDate))
  if (!weightRecords.length) return { prompts: [], shouldOfferProfileUpdate: false, latestWeightKg: null }
  const latestWeightKg = Number(weightRecords[weightRecords.length - 1].weightKg)
  const snapshotWeight = profileSnapshot && Number(profileSnapshot.currentWeightKg !== undefined ? profileSnapshot.currentWeightKg : profileSnapshot.weightKg)
  const prompts = []
  const shouldOfferProfileUpdate = Number.isFinite(snapshotWeight) && Math.abs(latestWeightKg - snapshotWeight) >= HEALTH_PROMPT_RULES.profileWeightChange.thresholdKg
  if (shouldOfferProfileUpdate) prompts.push({ key: 'profile_weight_change', text: '最新体重与当前方案记录相差较大，是否前往更新画像？', status: 'active' })
  if (weightRecords.length >= HEALTH_PROMPT_RULES.noticeableWeightChange.minimumRecords) {
    const firstWeight = Number(weightRecords[0].weightKg)
    if (Math.abs(latestWeightKg - firstWeight) >= HEALTH_PROMPT_RULES.noticeableWeightChange.thresholdKg) prompts.push({ key: 'noticeable_weight_change', text: '近期变化较明显，请确认测量条件并持续观察。', status: 'product_draft' })
  }
  return { prompts, shouldOfferProfileUpdate, latestWeightKg }
}

module.exports = { shiftDateKey, filterByRange, metricValue, buildTrend, evaluateHealthPrompts }
