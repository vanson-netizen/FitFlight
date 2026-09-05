const crypto = require('crypto')

const CHECKIN_COLLECTION = 'cultivation_daily_checkins'
const CHECKIN_ITEMS = Object.freeze(['exercise', 'diet', 'sleep'])
const ITEM_FIELDS = Object.freeze({ exercise: 'exerciseCompleted', diet: 'dietCompleted', sleep: 'sleepCompleted' })
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

function validateGetInput(event) {
  return typeof event.planId === 'string' && event.planId.length > 0 && event.planId.length <= 128 && isDateKey(event.date)
}

function validateToggleInput(event) {
  return validateGetInput(event) && CHECKIN_ITEMS.includes(event.item) && typeof event.completed === 'boolean' && Number.isInteger(event.expectedRevision) && event.expectedRevision >= 0
}

function emptyCheckin(planId, date) {
  return { planId, date, exerciseCompleted: false, dietCompleted: false, sleepCompleted: false, completedCount: 0, revision: 0 }
}

function publicCheckin(record, planId, date) {
  const source = record || emptyCheckin(planId, date)
  const result = { planId, date, exerciseCompleted: source.exerciseCompleted === true, dietCompleted: source.dietCompleted === true, sleepCompleted: source.sleepCompleted === true, completedCount: 0, revision: Number.isInteger(source.revision) && source.revision >= 0 ? source.revision : 0 }
  result.completedCount = [result.exerciseCompleted, result.dietCompleted, result.sleepCompleted].filter(Boolean).length
  return result
}

function applyToggle(record, planId, date, item, completed) {
  const next = publicCheckin(record, planId, date)
  next[ITEM_FIELDS[item]] = completed
  next.completedCount = [next.exerciseCompleted, next.dietCompleted, next.sleepCompleted].filter(Boolean).length
  next.revision += 1
  return next
}

function checkinDocumentId(openid, planId, date) {
  return crypto.createHash('sha256').update(`${openid}\n${planId}\n${date}`).digest('hex')
}

function hasDayPlan(plan, date) {
  const content = plan && plan.content
  if (!content || !Array.isArray(content.dailyPlans)) return false
  const startDate = content.cycleStartDate || (content.summary && content.summary.startDate)
  const endDate = content.cycleEndDate || (content.summary && content.summary.endDate)
  return (!startDate || date >= startDate) && (!endDate || date <= endDate) && content.dailyPlans.some((item) => item && item.date === date)
}

module.exports = { CHECKIN_COLLECTION, CHECKIN_ITEMS, ITEM_FIELDS, isDateKey, validateGetInput, validateToggleInput, emptyCheckin, publicCheckin, applyToggle, checkinDocumentId, hasDayPlan }
