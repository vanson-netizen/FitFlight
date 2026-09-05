const TODAY_PLAN_PAGE_STATUS = Object.freeze({
  LOADING: 'loading',
  EMPTY: 'empty',
  READY: 'ready',
  REST: 'rest',
  ERROR: 'error'
  ,SAFETY_BLOCKED: 'safety_blocked'
  ,OUTDATED: 'outdated'
  ,GENERATING: 'generating'
  ,ARCHIVED: 'archived'
})

const MEAL_DISPLAY_MODE = Object.freeze({
  RECOMMENDED: 'recommended',
  ACTUAL: 'actual'
})

const MEAL_SECTIONS = Object.freeze([
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' }
])

const LEGACY_DIET_TASKS = Object.freeze({
  fat_loss: ['至少一餐包含蛋白质食物', '至少吃一份蔬菜，少选油炸食品或含糖饮料'],
  muscle_gain: ['三餐中安排蛋白质食物', '训练前后增加一份主食或蛋白质食物'],
  weight_gain: ['按时完成三餐', '增加一份主食或蛋白质食物'],
  maintain: ['保持三餐结构', '今天避免连续多餐过量'],
  fitness_improvement: ['训练前避免空腹过久', '训练后补充正常正餐']
})

function emptyMeals() {
  return { breakfast: [], lunch: [], dinner: [] }
}

function createEmptyTodayPlan(date) {
  return {
    planId: null,
    planVersion: null,
    ruleReviewStatus: '',
    planDisclaimer: '',
    date,
    cycle: { currentWeek: 1, totalWeeks: 4, dayOfWeek: 1, stageName: '' },
    plannedExercise: {
      isRestDay: false,
      suggestedTime: '',
      totalDurationMinutes: null,
      intensity: '',
      summary: '',
      items: []
    },
    nutrition: {
      estimatedTargetKcal: null,
      disclaimer: '',
      tasks: [],
      nearbyFoodOptions: [],
      recommendedMeals: emptyMeals()
    },
    recommendedSleep: {
      bedtime: '',
      wakeTime: '',
      durationMinutes: null,
      tips: [],
      task: '',
      advice: ''
    }
  }
}

function createEmptyDailyRecord(date) {
  return {
    planId: null,
    date,
    exerciseRecord: { completedItemIds: [], sessions: [] },
    completedSections: [],
    actualMeals: emptyMeals(),
    actualKcal: null,
    actualSleep: null
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function hasAnyMeal(meals) {
  return MEAL_SECTIONS.some(({ key }) => asArray(meals && meals[key]).length > 0)
}

function normalizeMeals(meals) {
  return MEAL_SECTIONS.reduce((result, { key }) => {
    result[key] = asArray(meals && meals[key]).map((item, index) => ({
      itemId: item && item.itemId ? String(item.itemId) : `${key}-${index}`,
      title: item && item.title ? String(item.title) : '未命名内容',
      description: item && item.description ? String(item.description) : ''
    }))
    return result
  }, emptyMeals())
}

function mealSections(meals) {
  return MEAL_SECTIONS.map(({ key, label }) => ({ key, label, items: meals[key] }))
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '--'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} 分钟`
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
}

function legacyNutritionTasks(plan) {
  const restTasks = {
    muscle_gain: ['三餐中安排蛋白质食物', '保持三餐，不因休息日跳餐'],
    fitness_improvement: ['保持三餐结构', '至少一餐包含蔬菜和蛋白质食物']
  }
  const base = plan.plannedExercise.dayType !== 'training' && restTasks[plan.goal]
    ? restTasks[plan.goal]
    : (LEGACY_DIET_TASKS[plan.goal] || ['至少一餐包含蛋白质食物', '至少吃一份蔬菜'])
  const hydration = plan.plannedExercise.dayType === 'training'
    ? '分次、规律饮水；训练前后适量补水，高温或长时间运动时分次补充（约 6—8 杯，按个人情况调整）'
    : '分次、规律饮水（约 6—8 杯，按个人情况调整）'
  return [...base.slice(0, 2), hydration]
}

function normalizeFoodOptions(items) {
  return asArray(items).slice(0, 3).map((item, index) => ({
    foodOptionId: item.foodOptionId || `food-option-${index}`,
    dishName: item.dishName || '餐食选项',
    locationText: item.diningHall && [item.diningHall.name, item.diningHall.floor].filter(Boolean).join(' · '),
    sourceNote: '人工整理、信息仅供参考'
  }))
}

function buildTodayPlanDisplayModel(planInput, dailyRecordInput, requestedMealMode) {
  if (!planInput) return null
  const plan = { ...createEmptyTodayPlan(planInput.date || ''), ...planInput }
  plan.cycle = { ...createEmptyTodayPlan(plan.date).cycle, ...(planInput.cycle || {}) }
  plan.plannedExercise = { ...createEmptyTodayPlan(plan.date).plannedExercise, ...(planInput.plannedExercise || {}) }
  plan.nutrition = { ...createEmptyTodayPlan(plan.date).nutrition, ...(planInput.nutrition || {}) }
  plan.recommendedSleep = { ...createEmptyTodayPlan(plan.date).recommendedSleep, ...(planInput.recommendedSleep || {}) }

  const dailyRecord = { ...createEmptyDailyRecord(plan.date), ...(dailyRecordInput || {}) }
  dailyRecord.exerciseRecord = { ...createEmptyDailyRecord(plan.date).exerciseRecord, ...((dailyRecordInput && dailyRecordInput.exerciseRecord) || {}) }
  const recommendedMeals = normalizeMeals(plan.nutrition.recommendedMeals)
  const actualMeals = normalizeMeals(dailyRecord.actualMeals)
  const actualMealsExist = hasAnyMeal(actualMeals)
  const displayMode = requestedMealMode === MEAL_DISPLAY_MODE.RECOMMENDED
    ? MEAL_DISPLAY_MODE.RECOMMENDED
    : requestedMealMode === MEAL_DISPLAY_MODE.ACTUAL && actualMealsExist
      ? MEAL_DISPLAY_MODE.ACTUAL
      : actualMealsExist ? MEAL_DISPLAY_MODE.ACTUAL : MEAL_DISPLAY_MODE.RECOMMENDED
  const displayedMeals = displayMode === MEAL_DISPLAY_MODE.ACTUAL ? actualMeals : recommendedMeals
  const completedIds = new Set(asArray(dailyRecord.exerciseRecord.completedItemIds))
  const exerciseItems = asArray(plan.plannedExercise.items).map((item, index) => ({
    itemId: item && item.itemId ? String(item.itemId) : `exercise-${index}`,
    title: item && item.title ? String(item.title) : '未命名项目',
    durationText: formatMinutes(item && item.durationMinutes),
    setsText: Number.isFinite(item && item.sets) ? `${item.sets} 组` : '',
    repsText: Number.isFinite(item && item.reps) ? `${item.reps} 次` : '',
    setDurationText: Number.isFinite(item && item.setDurationSeconds) ? `每组 ${item.setDurationSeconds} 秒` : '',
    restText: Number.isFinite(item && item.restSeconds) && item.restSeconds > 0 ? `组间休息 ${item.restSeconds} 秒` : '',
    substituteText: asArray(item && item.substitutes).map((substitute) => substitute.name).filter(Boolean).join(' / '),
    safetyText: asArray(item && item.safetyNotices).join('；'),
    intensityText: item && item.intensityDescription ? String(item.intensityDescription) : '',
    description: item && item.description ? String(item.description) : '',
    completed: completedIds.has(item && item.itemId)
  }))
  const completedSections = new Set(asArray(dailyRecord.completedSections).filter((section) => ['exercise', 'nutrition', 'sleep'].includes(section)))
  const completedCount = completedSections.size
  const totalCount = 3
  const nutritionTasks = asArray(plan.nutrition.tasks).length ? asArray(plan.nutrition.tasks).slice(0, 3) : legacyNutritionTasks(plan)
  const nearbyFoodOptions = normalizeFoodOptions(plan.nutrition.nearbyFoodOptions || (plan.resourceMatches && plan.resourceMatches.foodOptions))
  const sleepTask = plan.recommendedSleep.task || '今晚为睡眠预留 7 小时以上时间'
  const sleepAdvice = plan.recommendedSleep.advice || asArray(plan.recommendedSleep.tips)[0] || '尽量保持和平时接近的入睡与起床节奏。'

  return {
    planId: plan.planId,
    planVersion: plan.planVersion,
    ruleReviewStatus: plan.ruleReviewStatus || '',
    planDisclaimer: plan.planDisclaimer || '',
    date: plan.date,
    cycle: plan.cycle,
    progress: {
      completedCount,
      totalCount,
      percent: totalCount > 0 ? Number(((completedCount / totalCount) * 100).toFixed(2)) : 0
    },
    plannedExercise: {
      ...plan.plannedExercise,
      intensity: String(plan.plannedExercise.intensity || '').replace(/[，,]\s*可以说短句\s*$/, '').trim(),
      isExecutableTraining: plan.plannedExercise.dayType !== 'training' || (Number.isInteger(plan.plannedExercise.trainingDayIndex) && Boolean(plan.plannedExercise.theme) && plan.plannedExercise.warmup && Array.isArray(plan.plannedExercise.mainExercises) && plan.plannedExercise.mainExercises.length > 0 && plan.plannedExercise.aerobic && plan.plannedExercise.cooldown),
      totalDurationText: formatMinutes(plan.plannedExercise.totalDurationMinutes),
      items: exerciseItems
    },
    exerciseRecord: dailyRecord.exerciseRecord,
    nutrition: {
      estimatedTargetKcal: Number.isFinite(plan.nutrition.estimatedTargetKcal) ? plan.nutrition.estimatedTargetKcal : null,
      actualKcal: Number.isFinite(dailyRecord.actualKcal) ? dailyRecord.actualKcal : null,
      disclaimer: plan.nutrition.disclaimer || '',
      tasks: nutritionTasks,
      nearbyFoodOptions,
      recommendedMeals,
      actualMeals,
      displayMode,
      actualMealsExist,
      displayedMealSections: mealSections(displayedMeals)
    },
    sleep: {
      recommendedSleep: { ...plan.recommendedSleep, task: sleepTask, advice: sleepAdvice },
      recommendedDurationText: formatMinutes(plan.recommendedSleep.durationMinutes),
      actualSleep: dailyRecord.actualSleep || null
    }
  }
}

module.exports = {
  TODAY_PLAN_PAGE_STATUS,
  MEAL_DISPLAY_MODE,
  createEmptyTodayPlan,
  createEmptyDailyRecord,
  buildTodayPlanDisplayModel
}
