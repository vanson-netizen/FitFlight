const assert = require('assert')
const fs = require('fs')
const { evaluateMajorChange } = require('../cloudfunctions/userPortrait/change-policy')
const { validateRequestFields } = require('../cloudfunctions/trainingPlan/request-validator')

const reported = (value) => ({ value })
const previousPortrait = {
  trainingGoal: reported('muscle_gain'), campus: reported('xueyuan_road'),
  trainingConditions: { availableDaysPerWeek: reported(3), sessionDurationMinutes: reported(30), experienceLevel: reported('beginner'), equipmentAccess: reported('bodyweight'), exercisePreferences: reported(['strength']) },
  safetyConditions: { exerciseLimitationStatus: reported('none') }, changeBaseline: { weightKg: 60, targetWeightKg: null }
}
const nextPortrait = { campus: 'xueyuan_road', trainingGoal: 'fat_loss', trainingConditions: { availableDaysPerWeek: 3, sessionDurationMinutes: 30, experienceLevel: 'beginner', equipmentAccess: 'bodyweight', exercisePreferences: ['walking'] }, safetyConditions: { exerciseLimitationStatus: 'none' } }
const change = evaluateMajorChange(previousPortrait, nextPortrait, { weightKg: 60, targetWeightKg: null })
assert.strictEqual(change.majorChange, true)
assert.ok(change.reasons.includes('trainingGoal'))

const unchangedPortrait = { campus: 'xueyuan_road', trainingGoal: 'muscle_gain', trainingConditions: { availableDaysPerWeek: 3, sessionDurationMinutes: 30, experienceLevel: 'beginner', equipmentAccess: 'bodyweight', exercisePreferences: ['strength'] }, safetyConditions: { exerciseLimitationStatus: 'none' } }
assert.strictEqual(evaluateMajorChange(previousPortrait, unchangedPortrait, { weightKg: 64.9, targetWeightKg: null }).reasons.includes('weightKg'), false)
assert.strictEqual(evaluateMajorChange(previousPortrait, unchangedPortrait, { weightKg: 65, targetWeightKg: null }).reasons.includes('weightKg'), true)
const targetBaseline = { ...previousPortrait, changeBaseline: { weightKg: 60, targetWeightKg: 65 } }
assert.strictEqual(evaluateMajorChange(targetBaseline, unchangedPortrait, { weightKg: 60, targetWeightKg: 67.9 }).reasons.includes('targetWeightKg'), false)
assert.strictEqual(evaluateMajorChange(targetBaseline, unchangedPortrait, { weightKg: 60, targetWeightKg: 68 }).reasons.includes('targetWeightKg'), true)
const campusOnly = { ...unchangedPortrait, campus: 'shahe' }
assert.strictEqual(evaluateMajorChange(previousPortrait, campusOnly, { weightKg: 60, targetWeightKg: null }).majorChange, false, '校区变化只刷新资源')

assert.strictEqual(validateRequestFields({ action: 'requestGeneration', generationType: 'adjustment', requestId: 'request-123', profileVersion: 2, portraitVersion: 5, userInfo: {}, tcbContext: {} }).ok, true)
assert.strictEqual(validateRequestFields({ action: 'requestGeneration', generationType: 'adjustment', requestId: 'request-123', profileVersion: 2, portraitVersion: 5, goal: 'fat_loss' }).ok, false)
assert.strictEqual(validateRequestFields({ action: 'requestGeneration', generationType: 'adjustment', requestId: 'request-123', profileVersion: 2, portraitVersion: 5, openid: 'forbidden' }).ok, false)

const trainingPlanService = require('../services/training-plan-service')
const portraitService = require('../services/user-portrait-service')
const calls = []
trainingPlanService.createRequestId = () => 'adjustment-request-1'
trainingPlanService.setPortraitAdjustmentPending = async () => { calls.push(['pending']) }
trainingPlanService.deferGeneration = async (...args) => { calls.push(['defer', ...args]); return { planStatus: 'outdated' } }
trainingPlanService.requestGeneration = async (...args) => { calls.push(['generate', ...args]); return { planStatus: 'active' } }

let pageDefinition
global.Page = (definition) => { pageDefinition = definition }
global.wx = { cloud: {}, showModal: () => {}, showToast: () => {}, redirectTo: () => {} }
require('../pages/portrait-editor/portrait-editor')
function pageFrom(definition, data = {}) {
  return { ...definition, data: { ...definition.data, ...data }, setData(update) { this.data = { ...this.data, ...update } }, finish: async () => {} }
}

async function testEditorBranches() {
  const result = { profileVersion: 2, portrait: { portraitVersion: 5 } }
  calls.length = 0
  await pageFrom(pageDefinition).deferPlanAdjustment(result)
  assert.deepStrictEqual(calls, [['defer', 2, 'adjustment']])

  calls.length = 0
  const page = pageFrom(pageDefinition)
  await Promise.all([page.requestPlanAdjustment(result), page.requestPlanAdjustment(result)])
  const generationCalls = calls.filter(([name]) => name === 'generate')
  assert.strictEqual(generationCalls.length, 2)
  assert.ok(generationCalls.every((call) => call[2] === 'adjustment-request-1'))
  assert.deepStrictEqual(generationCalls[0][3], { profileVersion: 2, portraitVersion: 5 })
}

async function testPlanPageRefresh() {
  delete require.cache[require.resolve('../pages/my-plan/my-plan')]
  let myPlanDefinition
  global.Page = (definition) => { myPlanDefinition = definition }
  const planResolvers = []
  trainingPlanService.getPlanStatus = () => new Promise((resolve) => planResolvers.push(resolve))
  portraitService.getPortrait = async () => ({ profileVersion: 2, portrait: { portraitVersion: 5, trainingGoal: reported('fat_loss') }, planEligibilityStatus: 'eligible' })
  const { buildPlanView } = require('../pages/my-plan/my-plan')
  const oldPlan = { planId: 'old-muscle-plan', portraitVersion: 4, content: { summary: { goal: 'muscle_gain', planName: '力量与恢复培养' }, cycle: { weeks: [{ weekNumber: 1, startDate: '2026-09-01', endDate: '2026-09-07' }] } } }
  const newPlan = { planId: 'new-fat-plan', portraitVersion: 5, content: { summary: { goal: 'fat_loss', planName: '减脂习惯培养' }, cycle: { weeks: [{ weekNumber: 1, startDate: '2026-09-01', endDate: '2026-09-07' }] } } }
  const difference = buildPlanView(oldPlan, 'fat_loss', new Date('2026-09-01'))
  assert.strictEqual(difference.goalLabel, '增肌')
  assert.strictEqual(difference.currentGoalLabel, '减脂')
  assert.strictEqual(difference.goalChanged, true)

  const page = pageFrom(myPlanDefinition)
  const first = page.loadPlanStatus()
  const second = page.loadPlanStatus()
  planResolvers[1]({ planStatus: 'active', activePlan: newPlan })
  await second
  planResolvers[0]({ planStatus: 'outdated', activePlan: oldPlan })
  await first
  assert.strictEqual(page.data.activePlan.planId, 'new-fat-plan')
  assert.strictEqual(page.data.planView.goal, 'fat_loss')
  assert.strictEqual(typeof myPlanDefinition.onShow, 'function')
}

async function run() {
  await testEditorBranches()
  await testPlanPageRefresh()
  const cloudSource = fs.readFileSync('cloudfunctions/trainingPlan/index.js', 'utf8')
  const portraitSource = fs.readFileSync('cloudfunctions/userPortrait/index.js', 'utf8')
  assert.ok(cloudSource.includes('currentPlanId: planId'))
  assert.ok(cloudSource.includes('status: PLAN_STATUS.ARCHIVED'))
  assert.ok(cloudSource.includes('画像版本变化本身不等于方案失效'))
  assert.ok(cloudSource.includes("_openid: openid"))
  assert.ok(portraitSource.includes("planRelevantChanged: change.majorChange"))
  assert.ok(portraitSource.includes("planAction: shouldAdjustPlan ? 'pending_confirmation' : 'none'"))
  console.log('Plan adjustment flow checks passed.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
