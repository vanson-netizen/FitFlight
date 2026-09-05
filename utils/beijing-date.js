const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

function pad(value) { return String(value).padStart(2, '0') }

function getBeijingDateParts(date = new Date()) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), weekday: shifted.getUTCDay() }
}

function beijingDateKey(date = new Date()) {
  const parts = getBeijingDateParts(date)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function beijingDateLabel(date = new Date()) {
  const parts = getBeijingDateParts(date)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${parts.month} 月 ${parts.day} 日 · ${weekdays[parts.weekday]}`
}

module.exports = { BEIJING_OFFSET_MS, getBeijingDateParts, beijingDateKey, beijingDateLabel }
