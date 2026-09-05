const assert = require('assert')
const fs = require('fs')
const { generate, RULE_VERSION, RULE_REVIEW_STATUS, scheduleFor } = require('../cloudfunctions/trainingPlan/plan-generator')
const { evaluateSafetyGate } = require('../cloudfunctions/trainingPlan/safety-gate')
const { RULE_CONFIG } = require('../cloudfunctions/trainingPlan/rule-config')
const resources = require('../cloudfunctions/trainingPlan/data/buaa-resources.pending.1.json')
const { buildTodayPlanDisplayModel } = require('../constants/today-plan')

const reported = (value) => ({ value, source: 'user_reported' })
function fixture(goal = 'fitness_improvement', overrides = {}) {
  const targetWeightKg = goal === 'fat_loss' ? 55 : goal === 'weight_gain' ? 65 : null
  const profile = { gender: 'female', birthDate: '2000-01-01', heightCm: 170, weightKg: 60, targetWeightKg, activityLevel: 'light', profileVersion: 2, ...(overrides.profile || {}) }
  const safetyScreening = Object.fromEntries(['painOrInjuryStatus', 'postSurgeryOrRehabStatus', 'doctorRestrictionStatus', 'specialPhysicalStatus', 'medicalPurposeStatus', 'eatingConcernStatus'].map((field) => [field, 'none']))
  Object.assign(safetyScreening, { safetyAcknowledged: true, safetyScreeningVersion: 'safety-screening-v1', ...(overrides.safetyScreening || {}) })
  const portrait = { status: 'complete', profileVersion: 2, portraitVersion: 4, campus: reported('xueyuan_road'), trainingGoal: reported(goal), trainingConditions: { availableDaysPerWeek: reported(overrides.days || 3), sessionDurationMinutes: reported(overrides.minutes || 30), experienceLevel: reported(overrides.experience || 'beginner'), equipmentAccess: reported('bodyweight'), exercisePreferences: reported(overrides.preferences || ['walking']) }, safetyConditions: { exerciseLimitationStatus: reported(overrides.limitation || 'none') }, safetyScreening }
  if (overrides.portrait) Object.assign(portrait, overrides.portrait)
  return { profile, profileVersion: 2, portrait, now: new Date('2026-09-01T00:00:00.000Z'), planId: `plan-${goal}`, requestId: `request-${goal}` }
}

async function expectCode(input, code) {
  let actual = null
  try { await generate(input) } catch (error) { actual = error.code }
  assert.strictEqual(actual, code)
}

async function run() {
  const goals = ['fat_loss', 'muscle_gain', 'weight_gain', 'maintain', 'fitness_improvement']
  const outputs = {}
  for (const goal of goals) {
    const output = await generate(fixture(goal))
    outputs[goal] = output
    assert.strictEqual(output.ruleVersion, RULE_VERSION)
    assert.strictEqual(output.ruleReviewStatus, RULE_REVIEW_STATUS)
    assert.strictEqual(output.requestId, `request-${goal}`)
    assert.strictEqual(output.cycle.totalWeeks, RULE_CONFIG.cycle.totalWeeks)
    assert.strictEqual(output.cycle.weeks.length, 4)
    assert.strictEqual(output.dailyPlans.length, 28)
    assert.ok(output.dailyPlans.every((day) => day.planId === `plan-${goal}` && day.ruleVersion === output.ruleVersion && day.profileVersion === output.profileVersion && day.portraitVersion === output.portraitVersion && day.resourceDataVersion === output.resourceDataVersion))
    assert.ok(output.cycle.weeks.every((week) => week.plannedRecoveryDays >= 1))
    assert.strictEqual(output.cycle.weeks[2].progressionDecision, 'configured_progression')
    assert.ok(output.dailyPlans.filter((day) => day.dayType === 'training').every((day) => day.plannedExercise.trainingDayIndex && day.plannedExercise.theme && day.plannedExercise.items.length >= 4))
    assert.ok(output.dailyPlans.filter((day) => day.dayType === 'training').every((day) => day.plannedExercise.items.reduce((sum, item) => sum + item.durationMinutes, 0) + day.plannedExercise.transitionMinutes === day.plannedExercise.totalDurationMinutes))
    assert.ok(output.dailyPlans.every((day) => day.resourceMatches.venues.length === 0 && day.resourceMatches.venueFallback.displayText === '暂无已核实地点'))
    assert.ok(output.dailyPlans.every((day) => day.nutrition.estimatedTargetKcal === null && day.recommendedSleep.durationMinutes === null))
    assert.ok(output.dailyPlans.every((day) => day.nutrition.tasks.length === 3 && day.nutrition.tasks.some((task) => task.includes('饮水'))))
    assert.ok(output.summary.nutritionPrinciples.some((item) => item.includes('饮水')), '新方案生活策略应包含规律饮水')
    assert.ok(output.dailyPlans.filter((day) => day.dayType === 'training').every((day) => day.nutrition.tasks.some((task) => task.includes('训练前后适量补水'))))
    assert.ok(output.dailyPlans.filter((day) => day.dayType !== 'training').every((day) => day.nutrition.tasks.some((task) => task.includes('按个人情况调整'))))
    assert.ok(output.dailyPlans.every((day) => day.completionItems.length === 3 && !day.completionItems.includes('hydration')))
  }
  assert.strictEqual(new Set(goals.map((goal) => JSON.stringify(outputs[goal].summary.trainingFocus))).size, 5)
  assert.notDeepStrictEqual(outputs.fat_loss.summary.nutritionPrinciples, outputs.muscle_gain.summary.nutritionPrinciples)

  for (const days of [2, 3, 4]) {
    const output = await generate(fixture('fitness_improvement', { days }))
    assert.ok(output.cycle.weeks.every((week) => week.plannedTrainingDays <= days && week.plannedTrainingDays <= RULE_CONFIG.cycle.maximumStructuredTrainingDaysPerWeek && week.plannedLightActivityDays >= 1))
    assert.ok(output.cycle.weeks.every((week) => !week.dailyPlanDates.map((date) => output.dailyPlans.find((day) => day.date === date).dayType).join(',').includes('training,training,training')))
  }
  for (const minutes of [30, 45, 60]) assert.strictEqual((await generate(fixture('fitness_improvement', { minutes }))).summary.expectedSessionDurationMinutes, minutes)
  await expectCode(fixture('fitness_improvement', { minutes: 20 }), 'TRAINING_DURATION_UNSUPPORTED')
  assert.ok((await generate(fixture('fitness_improvement', { experience: 'beginner' }))).cycle.weeks.every((week) => !week.intensityRange.includes('高强度')))
  assert.ok((await generate(fixture('muscle_gain', { experience: 'experienced', preferences: ['strength'] }))).dailyPlans.some((day) => day.dayType === 'training' && day.plannedExercise.mainExercises.length > 0))
  assert.deepStrictEqual(scheduleFor(3), scheduleFor(3))
  const resourceFailureOutput = await generate({ ...fixture('fitness_improvement'), resourceRepository: { load: async () => { throw new Error('database unavailable') } } })
  assert.strictEqual(resourceFailureOutput.dailyPlans.length, 28)
  assert.ok(resourceFailureOutput.dailyPlans.every((day) => day.resourceMatches.venues.length === 0 && day.resourceMatches.venueFallback.displayText === '暂无已核实地点'))

  await expectCode(fixture('fitness_improvement', { profile: { birthDate: '2010-01-01' } }), 'MINOR_OUT_OF_V1_SCOPE')
  await expectCode(fixture('fitness_improvement', { safetyScreening: { painOrInjuryStatus: undefined } }), 'SAFETY_SCREENING_INCOMPLETE')
  await expectCode(fixture('fitness_improvement', { safetyScreening: { painOrInjuryStatus: 'present' } }), 'PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE')
  await expectCode(fixture('fitness_improvement', { limitation: 'unsure' }), 'LIMITATION_REQUIRES_CLARIFICATION')
  await expectCode(fixture('fitness_improvement', { portrait: { trainingConditions: null } }), 'PROFILE_OR_PORTRAIT_INCOMPLETE')
  await expectCode(fixture('fat_loss', { profile: { targetWeightKg: 65 } }), 'GOAL_DIRECTION_CONFLICT')
  await expectCode(fixture('weight_gain', { profile: { targetWeightKg: 50 } }), 'GOAL_DIRECTION_CONFLICT')
  const gateConflict = evaluateSafetyGate({ ...fixture(), profileVersion: 3 })
  assert.strictEqual(gateConflict.stableCode, 'PROFILE_OR_PORTRAIT_INCOMPLETE')

  assert.ok(resources.venues.every((item) => item.status === 'pending_verification'))
  assert.ok(resources.foodOptions.every((item) => item.status === 'pending_verification' && item.nutrition.estimatedKcal === null))
  const immutable = JSON.stringify(outputs.fitness_improvement)
  resources.venues[0].status = 'verified'
  assert.strictEqual(JSON.stringify(outputs.fitness_improvement), immutable)

  const today = outputs.fitness_improvement.dailyPlans[0]
  const display = buildTodayPlanDisplayModel({ ...today, planId: outputs.fitness_improvement.planId }, null)
  assert.strictEqual(display.planId, outputs.fitness_improvement.planId)
  assert.strictEqual(display.cycle.currentWeek, outputs.fitness_improvement.cycle.weeks[0].weekNumber)
  assert.ok(buildTodayPlanDisplayModel({ date: '2026-09-01', plannedExercise: {}, nutrition: {}, recommendedSleep: {} }, null))
  const legacyDisplay = buildTodayPlanDisplayModel({ date: '2026-09-01', goal: 'maintain', plannedExercise: { dayType: 'light_activity' }, nutrition: {}, recommendedSleep: {} }, null)
  assert.strictEqual(legacyDisplay.nutrition.tasks.length, 3)
  assert.ok(legacyDisplay.nutrition.tasks.some((task) => task.includes('饮水')))
  const resourceDisplay = buildTodayPlanDisplayModel({ date: '2026-09-01', plannedExercise: {}, nutrition: { nearbyFoodOptions: [{ foodOptionId: 'food-1', dishName: '测试菜品', diningHall: { name: '测试食堂', floor: '一层' } }] }, recommendedSleep: {} }, null)
  assert.strictEqual(resourceDisplay.nutrition.nearbyFoodOptions[0].sourceNote, '人工整理、信息仅供参考')
  assert.deepStrictEqual(buildTodayPlanDisplayModel({ date: '2026-09-01', plannedExercise: {}, nutrition: {}, recommendedSleep: {} }, null).nutrition.nearbyFoodOptions, [])
  global.Page = () => {}
  const { buildPlanView } = require('../pages/my-plan/my-plan')
  assert.strictEqual(buildPlanView({ content: {}, profileVersion: 1, ruleVersion: 'legacy' }).isLegacy, true)
  assert.strictEqual(buildPlanView({ content: outputs.fitness_improvement, profileVersion: 2, ruleVersion: RULE_VERSION }, new Date('2026-09-01')).weeks.length, 4)

  const indexSource = fs.readFileSync('cloudfunctions/trainingPlan/index.js', 'utf8')
  assert.ok(indexSource.includes("requestId: event.requestId"))
  assert.ok(indexSource.includes('status: PLAN_STATUS.ARCHIVED'))
  assert.ok(indexSource.includes('currentPlanId: planId'))
  assert.ok(indexSource.includes('画像版本变化本身不等于方案失效'))
  assert.ok(indexSource.includes('safetyScreeningVersion'))
  console.log('Cultivation plan V1 draft.2 checks passed.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
