const { RESOURCE_DATA_VERSION, matchVenue, matchFood } = require('./resource-matcher')
const { RULE_CONFIG } = require('./rule-config')
const { evaluateSafetyGate } = require('./safety-gate')
const { EXERCISE_LIBRARY_VERSION, TEMPLATE_VERSION, normalizeInput, buildWeeklyTraining } = require('./executable-training')
const { loadOrEmpty } = require('./campus-resource-repository')

const { ruleVersion: RULE_VERSION, generatorVersion: GENERATOR_VERSION } = RULE_CONFIG
const valueOf = (field, fallback = null) => field && typeof field === 'object' && 'value' in field ? field.value : (field === undefined ? fallback : field)
const pad = (value) => String(value).padStart(2, '0')
const dateKey = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
function addDays(date, count) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + count); return next }
function cycleStart(now) { const china = new Date(now.getTime() + 28800000); return new Date(Date.UTC(china.getUTCFullYear(), china.getUTCMonth(), china.getUTCDate())) }

const TRAINING_PATTERNS = { 2: [1, 4], 3: [0, 2, 5], 4: [0, 2, 4, 6] }
function scheduleFor(days) {
  const training = TRAINING_PATTERNS[days]
  if (!training) throw Object.assign(new Error('可执行训练方案仅支持每周 2、3 或 4 天'), { code: 'TRAINING_FREQUENCY_UNSUPPORTED' })
  const recovery = Array.from({ length: 7 }, (_, index) => index).find((index) => !training.includes(index))
  return Array.from({ length: 7 }, (_, index) => training.includes(index) ? 'training' : index === recovery ? 'recovery' : 'light_activity')
}

function matchResources(campus, portrait, planDate, goal, resourceData) {
  const venue = matchVenue({ campus, portrait, planDate, resources: resourceData })
  const tags = ['muscle_gain', 'weight_gain'].includes(goal) ? ['肉', '豆腐', '鸡蛋'] : ['粗粮', '水煮菜']
  const food = ['breakfast', 'lunch', 'dinner'].map((mealPeriod) => matchFood({ campus, mealPeriod, requiredFoodGroupTags: tags, planDate, resources: resourceData }))
  return { venue, food, venues: venue.candidates || [], foodOptions: food.flatMap((item) => item.candidates || []), venueFallback: { status: venue.status, displayText: venue.locationText || '暂无已核实地点' }, foodFallback: { status: 'no_match', displayText: '暂无已核实菜品' }, dataPendingVerification: Boolean(venue.dataPendingVerification || food.some((item) => item.dataPendingVerification)) }
}

function dailyNutritionTasks(policy, dayType) {
  const hydration = dayType === 'training'
    ? '分次、规律饮水；训练前后适量补水，高温或长时间运动时分次补充（约 6—8 杯，按个人情况调整）'
    : '分次、规律饮水（约 6—8 杯，按个人情况调整）'
  const foodTasks = dayType === 'training' ? policy.dailyDietTasks : (policy.dailyRestDietTasks || policy.dailyDietTasks)
  return [...foodTasks.slice(0, 2), hydration]
}

function sleepPlan(dayType) {
  return {
    bedtime: null, wakeTime: null, durationMinutes: null,
    task: '今晚为睡眠预留 7 小时以上时间',
    advice: dayType === 'training' ? '训练后留出放松和恢复时间，尽量按平时节奏入睡。' : '尽量保持和平时接近的入睡与起床节奏。'
  }
}

function passiveExercise(dayType) {
  if (dayType === 'recovery') return { isRestDay: true, dayType, trainingDayIndex: null, theme: '计划恢复', totalDurationMinutes: null, intensity: '恢复', intensityDescription: '不安排结构化训练', summary: '保持日常活动并关注身体感受。', items: [], safetyNotices: [RULE_CONFIG.stopNotice] }
  return { isRestDay: false, dayType, trainingDayIndex: null, theme: '轻松活动', totalDurationMinutes: 20, intensity: '轻松，可以完整交谈', intensityDescription: '轻松，可以完整交谈', summary: '安排轻松步行或温和活动，帮助保持规律。', items: [{ itemId: 'light-activity', section: 'main', exerciseId: 'brisk_walk', title: '轻松步行或原地踏步', durationMinutes: 20, sets: 1, reps: null, setDurationSeconds: 1200, restSeconds: 0, description: '保持能够完整交谈的节奏。', substituteExerciseIds: ['march_in_place'], substitutes: [{ exerciseId: 'march_in_place', name: '原地踏步' }], safetyNotices: ['户外注意天气、照明和路面。'] }], safetyNotices: [RULE_CONFIG.stopNotice] }
}

function addLocation(exercise, resources) {
  return Object.assign(exercise, { recommendedLocation: resources.venueFallback.displayText, locationStatus: resources.venue.status, locationStatusText: resources.venue.locationStatusText || '无已核实地点', dataPendingVerification: resources.dataPendingVerification })
}

async function generate({ profile, profileVersion, portrait, now = new Date(), planId = null, requestId = null, resourceRepository = null }) {
  const gate = evaluateSafetyGate({ profile, profileVersion, portrait, now })
  if (gate.decision !== 'eligible') throw Object.assign(new Error(gate.userMessage), { code: gate.stableCode })
  const goal = valueOf(portrait.trainingGoal)
  const goalPolicy = RULE_CONFIG.goalPolicies[goal]
  if (!goalPolicy) throw Object.assign(new Error('培养目标不受支持'), { code: 'TRAINING_GOAL_UNSUPPORTED' })
  const policy = { ...goalPolicy, diet: goalPolicy.lifestyle || goalPolicy.diet }
  const conditions = portrait.trainingConditions
  const input = normalizeInput({ goal, daysPerWeek: valueOf(conditions.availableDaysPerWeek), sessionDurationMinutes: valueOf(conditions.sessionDurationMinutes), experienceLevel: valueOf(conditions.experienceLevel), equipmentAccess: valueOf(conditions.equipmentAccess), exercisePreferences: valueOf(conditions.exercisePreferences, []) })
  const campus = valueOf(portrait.campus, 'unknown')
  const resourceData = resourceRepository ? await loadOrEmpty(resourceRepository) : require('./buaa-resources.pending.1.json')
  const firstDate = cycleStart(now)
  const schedule = scheduleFor(input.daysPerWeek)
  const dailyPlans = []
  const weeks = RULE_CONFIG.cycle.stages.map((stage, weekIndex) => {
    const weekNumber = weekIndex + 1
    const weekStart = addDays(firstDate, weekIndex * 7)
    const trainingDays = buildWeeklyTraining(input, weekNumber)
    let nextTraining = 0
    const weekPlans = schedule.map((dayType, dayIndex) => {
      const date = dateKey(addDays(weekStart, dayIndex))
      const resources = matchResources(campus, portrait, date, goal, resourceData)
      const training = dayType === 'training' ? trainingDays[nextTraining++] : null
      const exercise = addLocation(training ? { ...training, isRestDay: false, dayType: 'training', suggestedTime: '选择精神和体力较好的空闲时段，可按实际日程调整', summary: `${training.trainingDayLabel} · ${training.theme}` } : passiveExercise(dayType), resources)
      Object.assign(exercise, { recommendedScene: input.scene, recommendedSceneText: input.scene === 'gym' ? '健身房' : input.scene === 'outdoor_track' ? '操场或户外' : '宿舍徒手' })
      const nutrition = { principles: policy.diet, tasks: dailyNutritionTasks(policy, dayType), nearbyFoodOptions: resources.foodOptions, estimatedTargetKcal: null, disclaimer: RULE_CONFIG.disclaimer }
      const sleep = { ...sleepPlan(dayType), principles: policy.sleep }
      const title = training ? `${training.trainingDayLabel} · ${training.theme}` : dayType === 'light_activity' ? '轻活动日' : '恢复日'
      const day = { planId, date, weekIndex: weekNumber, dayIndex: dayIndex + 1, trainingDayIndex: training ? training.trainingDayIndex : null, phase: stage.key, dayType, title, summary: exercise.summary, cyclePosition: { weekNumber, dayOfWeek: dayIndex + 1, trainingDayIndex: training ? training.trainingDayIndex : null, stage: stage.key }, cycle: { currentWeek: weekNumber, totalWeeks: 4, dayOfWeek: dayIndex + 1, trainingDayIndex: training ? training.trainingDayIndex : null, stageName: stage.name }, exercise, plannedExercise: exercise, diet: { principles: policy.diet }, nutrition, sleep, recommendedSleep: sleep, completionItems: ['exercise', 'nutrition', 'sleep'], completionTemplate: { sections: ['exercise', 'nutrition', 'sleep'], completedItemIds: [] }, safetyNotes: exercise.safetyNotices, resourceSnapshot: resources, resourceMatches: resources, ruleVersion: RULE_VERSION, exerciseLibraryVersion: EXERCISE_LIBRARY_VERSION, templateVersion: TEMPLATE_VERSION, profileVersion, portraitVersion: portrait.portraitVersion, safetyScreeningVersion: portrait.safetyScreening.safetyScreeningVersion, resourceDataVersion: RESOURCE_DATA_VERSION }
      dailyPlans.push(day)
      return day
    })
    return { weekNumber, stage: stage.key, stageName: stage.name, startDate: dateKey(weekStart), endDate: dateKey(addDays(weekStart, 6)), plannedTrainingDays: input.daysPerWeek, plannedLightActivityDays: weekPlans.filter((day) => day.dayType === 'light_activity').length, plannedRecoveryDays: weekPlans.filter((day) => day.dayType === 'recovery').length, expectedSessionDurationMinutes: input.sessionDurationMinutes, intensityRange: input.experienceLevel === 'experienced' ? '轻松到较吃力，但动作始终稳定' : '轻松到中等，可以完整交谈或说短句', focus: [stage.focus, ...policy.training], progressionFocus: stage.focus, trainingStructure: trainingDays.map((item) => `${item.trainingDayLabel}：${item.theme}`), trainingDaySummaries: trainingDays.map(({ trainingDayIndex, trainingDayLabel, theme, totalDurationMinutes, intensityDescription }) => ({ trainingDayIndex, label: trainingDayLabel, theme, totalDurationMinutes, intensityDescription })), safetyNotices: [RULE_CONFIG.stopNotice], progressionDecision: weekNumber === 3 ? 'configured_progression' : 'hold', dailyPlanDates: weekPlans.map((day) => day.date) }
  })
  const endDate = dateKey(addDays(firstDate, 27))
  const profileSnapshot = { profileVersion, portraitVersion: portrait.portraitVersion, gender: profile.gender, birthDate: profile.birthDate, heightCm: profile.heightCm, currentWeightKg: profile.weightKg, targetWeightKg: profile.targetWeightKg, activityLevel: profile.activityLevel, goal, normalizedGoal: input.normalizedGoal, campus, availableDaysPerWeek: input.daysPerWeek, sessionDurationMinutes: input.sessionDurationMinutes, experienceLevel: valueOf(conditions.experienceLevel), normalizedExperienceLevel: input.experienceLevel, equipmentAccess: input.equipmentAccess, exercisePreferences: [...input.exercisePreferences], scene: input.scene }
  return { schemaVersion: RULE_CONFIG.schemaVersion, planId, requestId, planStatus: 'draft', ruleVersion: RULE_VERSION, exerciseLibraryVersion: EXERCISE_LIBRARY_VERSION, templateVersion: TEMPLATE_VERSION, ruleReviewStatus: RULE_CONFIG.ruleReviewStatus, generatorVersion: GENERATOR_VERSION, profileVersion, portraitVersion: portrait.portraitVersion, safetyScreeningVersion: portrait.safetyScreening.safetyScreeningVersion, resourceDataVersion: RESOURCE_DATA_VERSION, catalogVersions: { ...RULE_CONFIG.catalogVersions, exerciseLibrary: EXERCISE_LIBRARY_VERSION, trainingTemplates: TEMPLATE_VERSION }, generatedAt: now.toISOString(), cycleStartDate: dateKey(firstDate), cycleEndDate: endDate, disclaimer: RULE_CONFIG.disclaimer, profileSnapshot, safetyDecision: gate, summary: { planName: policy.name, goal, normalizedGoal: input.normalizedGoal, startDate: dateKey(firstDate), endDate, totalWeeks: 4, currentStage: RULE_CONFIG.cycle.stages[0].key, trainingDaysPerWeek: input.daysPerWeek, expectedSessionDurationMinutes: input.sessionDurationMinutes, trainingFocus: policy.training, trainingPrinciples: policy.training, arrangementReasons: [`根据目标、每周 ${input.daysPerWeek} 天、每次 ${input.sessionDurationMinutes} 分钟及器材条件确定模板`, '动作按固定顺序选择，相同输入生成相同训练内容'], weeklyStructureOverview: weeks.map(({ weekNumber, stage, stageName, focus, plannedTrainingDays, expectedSessionDurationMinutes, trainingDaySummaries }) => ({ weekNumber, stage, stageName, focus, plannedTrainingDays, expectedSessionDurationMinutes, trainingDaySummaries })), nutritionPrinciples: policy.diet, sleepPrinciples: policy.sleep, reviewMetrics: [policy.review], safetyNotices: [RULE_CONFIG.stopNotice], reviewDate: endDate }, cycle: { totalWeeks: 4, startDate: dateKey(firstDate), endDate, weeks }, dailyPlans, resourceSnapshot: dailyPlans.map((day) => ({ date: day.date, resourceMatches: day.resourceMatches })), sourceIds: RULE_CONFIG.sourceIds }
}

module.exports = { GENERATOR_VERSION, RULE_VERSION, RULE_REVIEW_STATUS: RULE_CONFIG.ruleReviewStatus, EXERCISE_LIBRARY_VERSION, TEMPLATE_VERSION, generate, scheduleFor }
