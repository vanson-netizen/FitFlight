const { EXERCISE_STATUS, FIFI_POINTS, FIFI_STAGES, FIFI_IMAGES, FIFI_DIALOGUES, ACHIEVEMENT_CONFIG } = require('../constants/fifi')

const EXERCISE_COMPLETE = new Set([EXERCISE_STATUS.COMPLETED, EXERCISE_STATUS.SCHEDULED_REST])

function normalizeRecord(record = {}) {
  const exerciseStatus = Object.values(EXERCISE_STATUS).includes(record.exerciseStatus) ? record.exerciseStatus : (record.exerciseCompleted ? EXERCISE_STATUS.COMPLETED : EXERCISE_STATUS.PENDING)
  return { date: String(record.date || ''), exerciseStatus, dietCompleted: record.dietCompleted === true, sleepCompleted: record.sleepCompleted === true, revision: Number(record.revision) || 0 }
}

function dedupeRecords(records = []) {
  const byDate = new Map()
  records.map(normalizeRecord).filter((record) => /^\d{4}-\d{2}-\d{2}$/.test(record.date)).forEach((record) => {
    const current = byDate.get(record.date)
    if (!current || record.revision >= current.revision) byDate.set(record.date, record)
  })
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function calculateDailyPoints(record) {
  const item = normalizeRecord(record)
  const exerciseDone = EXERCISE_COMPLETE.has(item.exerciseStatus)
  let points = (exerciseDone ? FIFI_POINTS.exercise : 0) + (item.dietCompleted ? FIFI_POINTS.diet : 0) + (item.sleepCompleted ? FIFI_POINTS.sleep : 0)
  if (exerciseDone && item.dietCompleted && item.sleepCompleted) points += FIFI_POINTS.allCompleteBonus
  return Math.min(points, FIFI_POINTS.dailyMaximum)
}

function calculateTotalPoints(records) {
  return dedupeRecords(records).reduce((total, record) => total + calculateDailyPoints(record), 0)
}

function calculateStageProgress(totalPoints) {
  const total = Math.max(0, Number(totalPoints) || 0)
  const index = FIFI_STAGES.findIndex((stage) => stage.max === null || total <= stage.max)
  const stage = FIFI_STAGES[index < 0 ? FIFI_STAGES.length - 1 : index]
  const nextStage = FIFI_STAGES[index + 1] || null
  const span = nextStage ? nextStage.min - stage.min : 1
  const progressPercent = nextStage ? Math.max(0, Math.min(100, ((total - stage.min) / span) * 100)) : 100
  return { ...stage, totalPoints: total, nextStageName: nextStage ? nextStage.name : '', pointsToNextStage: nextStage ? Math.max(0, nextStage.min - total) : 0, progressPercent: Number(progressPercent.toFixed(2)) }
}

function previousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function shiftDateKey(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function isCultivationDay(record) { return calculateDailyPoints(record) > 0 }

function calculateStreak(records, todayKey) {
  const completed = new Set(dedupeRecords(records).filter(isCultivationDay).map((record) => record.date))
  let cursor = todayKey
  if (!completed.has(cursor)) cursor = previousDateKey(cursor)
  let streak = 0
  while (completed.has(cursor)) { streak += 1; cursor = previousDateKey(cursor) }
  return streak
}

function calculateAchievements(records) {
  const scored = dedupeRecords(records).filter(isCultivationDay)
  const candidates = new Map()
  const unlock = (definition, achievedAt, order) => {
    if (!candidates.has(definition.key)) candidates.set(definition.key, { ...definition, achievedAt, order, unlocked: true })
  }
  let running = 0
  let previous = ''
  let totalPoints = 0
  scored.forEach((record, recordIndex) => {
    running = previous && previousDateKey(record.date) === previous ? running + 1 : 1
    previous = record.date
    const dailyPoints = calculateDailyPoints(record)
    totalPoints += dailyPoints
    ACHIEVEMENT_CONFIG.forEach((definition, order) => {
      const achieved = (definition.type === 'cultivation_days' && recordIndex + 1 >= definition.threshold) ||
        (definition.type === 'streak' && running >= definition.threshold) ||
        (definition.type === 'daily_points' && dailyPoints >= definition.threshold) ||
        (definition.type === 'total_points' && totalPoints >= definition.threshold)
      if (achieved) unlock(definition, record.date, order)
    })
  })
  return Array.from(candidates.values()).sort((a, b) => b.achievedAt.localeCompare(a.achievedAt) || a.order - b.order)
}

function buildAchievementCatalog(records) {
  const unlocked = new Map(calculateAchievements(records).map((achievement) => [achievement.key, achievement]))
  return ACHIEVEMENT_CONFIG.map((definition, order) => unlocked.get(definition.key) || { ...definition, order, achievedAt: '', unlocked: false })
}

function calculateLatestAchievement(records) {
  return calculateAchievements(records)[0] || null
}

function buildGrowthSummary(records, todayKey) {
  const normalized = dedupeRecords(records)
  const totalPoints = calculateTotalPoints(normalized)
  const streak = calculateStreak(normalized, todayKey)
  const achievements = calculateAchievements(normalized)
  return {
    records: normalized,
    totalPoints,
    stage: calculateStageProgress(totalPoints),
    streak,
    cultivationDays: normalized.filter(isCultivationDay).length,
    achievements,
    achievementCatalog: buildAchievementCatalog(normalized),
    latestAchievement: achievements[0] || null
  }
}

function buildRecentSevenDays(records, todayKey) {
  const byDate = new Map(dedupeRecords(records).map((record) => [record.date, record]))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(todayKey, index - 6)
    const record = byDate.get(date) || normalizeRecord({ date })
    const exerciseCompleted = EXERCISE_COMPLETE.has(record.exerciseStatus)
    const completedCount = Number(exerciseCompleted) + Number(record.dietCompleted) + Number(record.sleepCompleted)
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    return {
      date,
      label: index === 6 ? '今天' : `周${weekdays[weekday]}`,
      exerciseCompleted,
      dietCompleted: record.dietCompleted,
      sleepCompleted: record.sleepCompleted,
      completedCount,
      completionPercent: Math.round(completedCount / 3 * 100)
    }
  })
  const completedItems = days.reduce((total, day) => total + day.completedCount, 0)
  return { days, completionPercent: Math.round(completedItems / 21 * 100) }
}

function buildCurrentWeek(records, todayKey) {
  const weekday = new Date(`${todayKey}T00:00:00Z`).getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  const startDate = shiftDateKey(todayKey, -daysSinceMonday)
  const elapsedDays = daysSinceMonday + 1
  const relevant = dedupeRecords(records).filter((record) => record.date >= startDate && record.date <= todayKey)
  const completedItems = relevant.reduce((total, record) => {
    return total + Number(EXERCISE_COMPLETE.has(record.exerciseStatus)) + Number(record.dietCompleted) + Number(record.sleepCompleted)
  }, 0)
  return { startDate, elapsedDays, completionPercent: Math.round(completedItems / (elapsedDays * 3) * 100) }
}

function getTodayPresentation(record) {
  const item = normalizeRecord(record)
  const exerciseDone = EXERCISE_COMPLETE.has(item.exerciseStatus)
  const allDone = exerciseDone && item.dietCompleted && item.sleepCompleted
  const state = allDone ? 'celebrate' : (isCultivationDay(item) ? 'happy' : 'normal')
  return { state, image: FIFI_IMAGES[state], defaultDialogue: FIFI_DIALOGUES[state][0], dialogues: FIFI_DIALOGUES[state], points: calculateDailyPoints(item), exerciseDone, allDone }
}

module.exports = { normalizeRecord, dedupeRecords, calculateDailyPoints, calculateTotalPoints, calculateStageProgress, calculateStreak, calculateAchievements, calculateLatestAchievement, buildAchievementCatalog, buildGrowthSummary, buildRecentSevenDays, buildCurrentWeek, getTodayPresentation, isCultivationDay, shiftDateKey }
