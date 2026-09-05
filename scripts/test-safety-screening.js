const assert = require('assert')
const { validateRequest } = require('../cloudfunctions/userPortrait/validator')
const {
  SAFETY_STATUS_FIELDS,
  validateSafetyScreeningInput,
  evaluatePlanEligibility
} = require('../cloudfunctions/userPortrait/safety-screening')
const { USER_PORTRAIT_ACTIONS: clientActions } = require('../constants/user-portrait-actions')
const { USER_PORTRAIT_ACTIONS: cloudActions } = require('../cloudfunctions/userPortrait/actions')
const { validateSafetyForm, buildSavedAnswers } = require('../pages/safety-screening/safety-screening-helpers')
const { SAFETY_QUESTIONS } = require('../constants/safety-screening')

function screening(value, acknowledged = true) {
  return Object.fromEntries([...SAFETY_STATUS_FIELDS.map((field) => [field, value]), ['safetyAcknowledged', acknowledged]])
}

assert.deepStrictEqual(clientActions, cloudActions)

const validRequest = {
  action: clientActions.SAVE_SAFETY_SCREENING,
  safetyScreening: screening('none'),
  expectedPortraitVersion: 1,
  userInfo: { ignored: true },
  tcbContext: { ignored: true }
}
assert.strictEqual(validateRequest(validRequest).ok, true)
assert.strictEqual(validateRequest({ action: 'unknown' }).code, 'UNSUPPORTED_ACTION')
assert.strictEqual(validateRequest({ ...validRequest, unexpected: true }).code, 'INVALID_PARAM')
for (const field of ['openid', 'openId', '_openid', 'ownerOpenId', 'userId']) {
  assert.strictEqual(validateRequest({ ...validRequest, [field]: 'forbidden' }).code, 'INVALID_PARAM')
}

for (const value of ['none', 'present', 'unsure', 'prefer_not_to_answer']) {
  assert.ok(validateSafetyScreeningInput(screening(value)).value)
}
assert.strictEqual(validateSafetyScreeningInput(screening('none', false)).code, 'SAFETY_SCREENING_INCOMPLETE')
const missing = screening('none')
delete missing[SAFETY_STATUS_FIELDS[0]]
assert.strictEqual(validateSafetyScreeningInput(missing).code, 'SAFETY_SCREENING_INCOMPLETE')
assert.ok(validateSafetyScreeningInput({ ...screening('none'), unexpected: true }).errors)

const adultProfile = { birthDate: '2000-01-01' }
const unrestrictedPortrait = { safetyConditions: { exerciseLimitationStatus: 'none' } }
const storedNone = { ...screening('none'), safetyScreeningVersion: 'safety-screening-v1' }
const storedPresent = { ...screening('none'), painOrInjuryStatus: 'present', safetyScreeningVersion: 'safety-screening-v1' }
assert.strictEqual(evaluatePlanEligibility(adultProfile, unrestrictedPortrait, storedNone), 'eligible')
assert.strictEqual(evaluatePlanEligibility(adultProfile, unrestrictedPortrait, storedPresent), 'needs_professional_review')
for (const value of ['present', 'unsure', 'prefer_not_to_answer']) {
  assert.strictEqual(evaluatePlanEligibility(adultProfile, unrestrictedPortrait, { ...screening(value), safetyScreeningVersion: 'safety-screening-v1' }), 'needs_professional_review')
}

const answers = buildSavedAnswers(SAFETY_QUESTIONS, storedNone)
assert.strictEqual(validateSafetyForm(SAFETY_QUESTIONS, answers, true), '')
const incompleteAnswers = { ...answers }
delete incompleteAnswers[SAFETY_STATUS_FIELDS[0]]
assert.strictEqual(validateSafetyForm(SAFETY_QUESTIONS, incompleteAnswers, true), '请完成每一项选择')
assert.strictEqual(validateSafetyForm(SAFETY_QUESTIONS, answers, false), '请勾选确认后再保存')

let pageDefinition
let saveCalls = 0
let resolveSave
const modalCalls = []
const toastCalls = []
global.Page = (definition) => { pageDefinition = definition }
global.getCurrentPages = () => [{ route: 'pages/my-plan/my-plan' }, { route: 'pages/safety-screening/safety-screening' }]
global.wx = {
  cloud: { callFunction: () => Promise.reject(new Error('not used')) },
  showToast: (options) => toastCalls.push(options),
  showModal: (options) => { modalCalls.push(options); options.success() },
  navigateBack: ({ success } = {}) => { if (success) success() },
  redirectTo: () => { throw new Error('navigateBack should be used when a previous page exists') }
}
const portraitService = require('../services/user-portrait-service')
portraitService.saveSafetyScreening = () => {
  saveCalls += 1
  return new Promise((resolve) => { resolveSave = resolve })
}
portraitService.getPortrait = async () => ({ portrait: { portraitVersion: 3, safetyScreening: storedNone } })
require('../pages/safety-screening/safety-screening')

function createPage() {
  return {
    ...pageDefinition,
    data: { ...pageDefinition.data, answers: { ...answers }, safetyAcknowledged: true, portraitVersion: 1 },
    setData(update) { this.data = { ...this.data, ...update } }
  }
}

async function runPageChecks() {
  const page = createPage()
  const firstSave = page.save()
  const duplicateSave = page.save()
  assert.strictEqual(saveCalls, 1)
  resolveSave({ portraitVersion: 2, planEligibilityStatus: 'eligible' })
  await Promise.all([firstSave, duplicateSave])
  assert.strictEqual(modalCalls.length, 1)
  assert.strictEqual(page.data.saving, false)

  const reentered = createPage()
  await reentered.load()
  assert.deepStrictEqual(reentered.data.answers, answers)
  assert.strictEqual(reentered.data.safetyAcknowledged, true)

  const preserved = createPage()
  const originalAnswers = { ...preserved.data.answers }
  portraitService.saveSafetyScreening = async () => {
    const error = new Error('画像已更新，请重新加载')
    error.code = 'PORTRAIT_VERSION_CONFLICT'
    throw error
  }
  await preserved.save()
  assert.deepStrictEqual(preserved.data.answers, originalAnswers)
  assert.strictEqual(preserved.data.portraitVersion, 3)
  assert.ok(toastCalls.some(({ title }) => title === '画像已更新，请重新加载'))

  for (const failure of [
    Object.assign(new Error('网络连接失败，请检查网络后重试'), { code: 'NETWORK_ERROR' }),
    Object.assign(new Error('画像服务暂时不可用，请稍后重试'), { code: 'SERVER_ERROR' })
  ]) {
    const failedPage = createPage()
    const failedAnswers = { ...failedPage.data.answers }
    portraitService.saveSafetyScreening = async () => { throw failure }
    await failedPage.save()
    assert.deepStrictEqual(failedPage.data.answers, failedAnswers)
  }

  let fallbackUrl = ''
  global.getCurrentPages = () => [{ route: 'pages/safety-screening/safety-screening' }]
  global.wx.redirectTo = ({ url }) => { fallbackUrl = url }
  createPage().returnToPreviousPage()
  assert.strictEqual(fallbackUrl, '/pages/my-portrait/my-portrait')
}

runPageChecks().then(() => console.log('Safety screening checks passed.')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
