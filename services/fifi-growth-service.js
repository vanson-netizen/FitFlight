const trainingPlanService = require('./training-plan-service')
const { beijingDateKey } = require('../utils/beijing-date')
const { EXERCISE_STATUS, FIFI_PAGE_STATUS } = require('../constants/fifi')
const growth = require('../utils/fifi-growth')

function getPlanContent(activePlan) { return activePlan && (activePlan.content || (activePlan.plan && activePlan.plan.content)) }
function getPlanId(activePlan) { return activePlan && (activePlan.planId || activePlan._id || (activePlan.plan && (activePlan.plan._id || activePlan.plan.planId))) }

function exerciseStatusFor(day, checkin) {
  if (checkin && Object.values(EXERCISE_STATUS).includes(checkin.exerciseStatus)) return checkin.exerciseStatus
  if (checkin && checkin.exerciseCompleted === true) return EXERCISE_STATUS.COMPLETED
  return day && day.dayType === 'recovery' ? EXERCISE_STATUS.SCHEDULED_REST : EXERCISE_STATUS.PENDING
}

async function loadFifiGrowthData(now = new Date()) {
  const todayKey = beijingDateKey(now)
  const result = await trainingPlanService.getActivePlan()
  const activePlan = result && (result.activePlan || result.plan)
  const content = getPlanContent(activePlan)
  const planId = getPlanId(activePlan)
  const days = content && Array.isArray(content.dailyPlans) ? content.dailyPlans.filter((day) => day && day.date && day.date <= todayKey) : []
  if (!planId || !days.length) return buildModel([], todayKey, FIFI_PAGE_STATUS.EMPTY)

  const records = await Promise.all(days.map(async (day) => {
    const checkinResult = await trainingPlanService.getDailyCheckin(planId, day.date)
    const checkin = checkinResult && checkinResult.checkin
    return { date: day.date, exerciseStatus: exerciseStatusFor(day, checkin), dietCompleted: Boolean(checkin && checkin.dietCompleted), sleepCompleted: Boolean(checkin && checkin.sleepCompleted), revision: checkin && checkin.revision }
  }))
  return buildModel(records, todayKey, growth.calculateTotalPoints(records) > 0 ? FIFI_PAGE_STATUS.SUCCESS : FIFI_PAGE_STATUS.EMPTY)
}

function buildModel(records, todayKey, status) {
  const summary = growth.buildGrowthSummary(records, todayKey)
  const normalized = summary.records
  const todayRecord = normalized.find((record) => record.date === todayKey) || { date: todayKey, exerciseStatus: EXERCISE_STATUS.PENDING }
  return {
    status,
    ...summary,
    recentSevenDays: growth.buildRecentSevenDays(normalized, todayKey),
    currentWeek: growth.buildCurrentWeek(normalized, todayKey),
    today: { ...todayRecord, ...growth.getTodayPresentation(todayRecord) }
  }
}

module.exports = { loadFifiGrowthData, buildModel, exerciseStatusFor }
