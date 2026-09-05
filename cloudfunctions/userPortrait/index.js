const cloud = require('wx-server-sdk')
const { createHash } = require('crypto')
const { validateRequest, validatePortraitInput } = require('./validator')
const { evaluateMajorChange, shouldAskPlanAdjustment } = require('./change-policy')
const { buildStoredPortrait, resolvePortraitStatus } = require('./portrait-builder')
const { validateSafetyScreeningInput, evaluatePlanEligibility, SAFETY_SCREENING_VERSION } = require('./safety-screening')
const { USER_PORTRAIT_ACTIONS } = require('./actions')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const CONTRACT_VERSION = 'user-portrait-2026-09-05.3-diagnostic'
const PROFILE_COLLECTION = 'body_profiles'
const PORTRAIT_COLLECTION = 'user_portraits'
const PLAN_STATE_COLLECTION = 'training_plan_states'
const PLAN_COLLECTION = 'training_plans'
const ACTIVE_PLAN_STATUSES = ['active', 'outdated', 'safety_paused']
const PROFILE_FIELDS = ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']

function failure(code, message, extra = {}) {
  return { ok: false, code, message, ...extra }
}

function getProfileVersion(record) {
  return Number.isInteger(record && record.profileVersion) && record.profileVersion > 0 ? record.profileVersion : 1
}

function isCompleteProfile(record) {
  return Boolean(record && ['gender', 'birthDate', 'heightCm', 'weightKg', 'activityLevel'].every((field) => {
    return record[field] !== null && record[field] !== undefined && record[field] !== ''
  }))
}

async function findOne(collectionName, openid) {
  const result = await db.collection(collectionName).where({ _openid: openid }).limit(2).get()
  if (result.data.length > 1) return { conflict: true }
  return { record: result.data[0] || null }
}

function pickBodyProfile(record) {
  return PROFILE_FIELDS.reduce((profile, field) => {
    profile[field] = record[field] === undefined ? null : record[field]
    return profile
  }, {})
}

function publicPortrait(record, status, eligibilityStatus) {
  if (!record) return null
  return {
    portraitVersion: record.portraitVersion,
    portraitRuleVersion: record.portraitRuleVersion,
    changePolicyVersion: record.changePolicyVersion,
    profileVersion: record.profileVersion,
    status,
    calculatedMetrics: record.calculatedMetrics,
    campus: record.campus || { value: 'unknown', source: 'system_default' },
    trainingGoal: record.trainingGoal,
    trainingConditions: record.trainingConditions,
    safetyConditions: record.safetyConditions,
    safetyScreening: record.safetyScreening || null,
    planEligibilityStatus: eligibilityStatus,
    generatedAt: record.generatedAt,
    updatedAt: record.updatedAt
  }
}

async function loadContext(openid, trace) {
  trace.stage = 'query_body_profile'
  const profileLookup = await findOne(PROFILE_COLLECTION, openid)
  if (profileLookup.conflict) return { error: failure('PROFILE_DATA_CONFLICT', '身体档案存在异常，请联系支持人员') }
  trace.stage = 'query_portrait_and_screening'
  const portraitLookup = await findOne(PORTRAIT_COLLECTION, openid)
  if (portraitLookup.conflict) return { error: failure('PORTRAIT_DATA_CONFLICT', '画像数据存在异常，请联系支持人员') }
  return { profile: profileLookup.record, portrait: portraitLookup.record }
}

async function getPortrait(openid, trace) {
  const context = await loadContext(openid, trace)
  if (context.error) return context.error
  if (!isCompleteProfile(context.profile)) {
    return { ok: true, portraitStatus: 'incomplete', profileVersion: context.profile ? getProfileVersion(context.profile) : 0, bodyProfile: context.profile ? pickBodyProfile(context.profile) : null, portrait: null, planEligibilityStatus: evaluatePlanEligibility(context.profile, context.portrait) }
  }
  if (!context.portrait) {
    return { ok: true, portraitStatus: 'not_generated', profileVersion: getProfileVersion(context.profile), bodyProfile: pickBodyProfile(context.profile), portrait: null, planEligibilityStatus: evaluatePlanEligibility(context.profile, null) }
  }
  const status = resolvePortraitStatus(context.portrait, getProfileVersion(context.profile))
  const eligibilityStatus = evaluatePlanEligibility(context.profile, context.portrait)
  return {
    ok: true,
    portraitStatus: status,
    profileVersion: getProfileVersion(context.profile),
    bodyProfile: pickBodyProfile(context.profile),
    portrait: publicPortrait(context.portrait, status, eligibilityStatus),
    planEligibilityStatus: eligibilityStatus
  }
}

async function hasCurrentPlan(openid) {
  const stateLookup = await findOne(PLAN_STATE_COLLECTION, openid)
  if (stateLookup.conflict) return { error: failure('PLAN_STATE_CONFLICT', '方案状态存在异常，请联系支持人员') }
  const state = stateLookup.record
  return { value: Boolean(state && state.currentPlanId && ACTIVE_PLAN_STATUSES.includes(state.planStatus)) }
}

async function markPlanAdjustmentPending(openid, profileVersion) {
  const stateLookup = await findOne(PLAN_STATE_COLLECTION, openid)
  if (stateLookup.conflict) return { error: failure('PLAN_STATE_CONFLICT', '方案状态存在异常，请联系支持人员') }
  const state = stateLookup.record
  if (!state || !state.currentPlanId || !ACTIVE_PLAN_STATUSES.includes(state.planStatus)) return { changed: false }
  await db.collection(PLAN_STATE_COLLECTION).where({ _id: state._id, _openid: openid }).update({
    data: { planStatus: 'pending_confirmation', pendingProfileVersion: profileVersion, pendingGenerationType: 'adjustment', updatedAt: db.serverDate() }
  })
  return { changed: true }
}

async function savePortrait(openid, event, trace) {
  trace.stage = 'validate_portrait'
  if (!Number.isInteger(event.expectedPortraitVersion) || event.expectedPortraitVersion < 0) {
    return failure('INVALID_PARAM', '画像版本无效', { fieldErrors: { form: '请重新加载画像' } })
  }
  const validation = validatePortraitInput(event.portrait)
  if (validation.errors) return failure('INVALID_PARAM', '画像信息填写有误', { fieldErrors: validation.errors })

  const context = await loadContext(openid, trace)
  if (context.error) return context.error
  if (!isCompleteProfile(context.profile)) return failure('PROFILE_INCOMPLETE', '请先完善身体信息')
  const currentPortraitVersion = context.portrait && Number.isInteger(context.portrait.portraitVersion) ? context.portrait.portraitVersion : 0
  if (event.expectedPortraitVersion !== currentPortraitVersion) return failure('PORTRAIT_VERSION_CONFLICT', '画像已在其他页面更新，请重新加载')

  trace.stage = 'evaluate_portrait_change'
  const change = evaluateMajorChange(context.portrait, validation.value, context.profile)
  trace.stage = 'query_plan_state'
  const plan = await hasCurrentPlan(openid)
  if (plan.error) return plan.error
  const portraitVersion = currentPortraitVersion + 1
  const now = db.serverDate()
  trace.stage = 'build_portrait'
  const stored = buildStoredPortrait(validation.value, context.profile, getProfileVersion(context.profile), portraitVersion, now)
  stored.safetyScreening = context.portrait ? (context.portrait.safetyScreening || null) : null
  stored.planEligibilityStatus = evaluatePlanEligibility(context.profile, stored)
  if (!context.portrait) {
    trace.stage = 'create_portrait'
    try {
      await db.collection(PORTRAIT_COLLECTION).add({ data: { ...stored, _openid: openid, createdAt: now } })
    } catch (error) {
      const latest = await findOne(PORTRAIT_COLLECTION, openid)
      if (latest.record || latest.conflict) return failure('PORTRAIT_VERSION_CONFLICT', '画像已在其他页面更新，请重新加载')
      throw error
    }
  } else {
    trace.stage = 'update_portrait'
    const result = await db.collection(PORTRAIT_COLLECTION).where({
      _id: context.portrait._id,
      _openid: openid,
      portraitVersion: currentPortraitVersion
    }).update({ data: stored })
    if (!result.stats || result.stats.updated !== 1) return failure('PORTRAIT_VERSION_CONFLICT', '画像已在其他页面更新，请重新加载')
  }

  trace.stage = 'pause_plan_for_safety'
  await pausePlanForSafety(openid, stored.planEligibilityStatus)
  const shouldAdjustPlan = shouldAskPlanAdjustment(plan.value, change.majorChange)
  if (stored.planEligibilityStatus === 'eligible' && shouldAdjustPlan) {
    trace.stage = 'mark_plan_adjustment'
    const pending = await markPlanAdjustmentPending(openid, getProfileVersion(context.profile))
    if (pending.error) return pending.error
  }
  return {
    ok: true,
    portraitStatus: 'complete',
    portrait: publicPortrait(stored, 'complete', stored.planEligibilityStatus),
    profileVersion: getProfileVersion(context.profile),
    planEligibilityStatus: stored.planEligibilityStatus,
    majorChange: change.majorChange,
    majorChangeReasons: change.reasons,
    changedFields: change.reasons,
    planRelevantChanged: change.majorChange,
    planAction: shouldAdjustPlan ? 'pending_confirmation' : 'none',
    hasCurrentPlan: plan.value,
    shouldAskPlanAdjustment: shouldAdjustPlan
  }
}

async function pausePlanForSafety(openid, eligibilityStatus) {
  if (eligibilityStatus === 'eligible') return
  const stateLookup = await findOne(PLAN_STATE_COLLECTION, openid)
  if (stateLookup.conflict || !stateLookup.record || !stateLookup.record.currentPlanId) return
  const state = stateLookup.record
  const now = db.serverDate()
  await db.collection(PLAN_COLLECTION).where({ _id: state.currentPlanId, _openid: openid }).update({
    data: { status: 'safety_paused', safetyPausedAt: now, updatedAt: now }
  })
  await db.collection(PLAN_STATE_COLLECTION).where({ _id: state._id, _openid: openid }).update({
    data: { planStatus: 'safety_paused', pendingProfileVersion: null, pendingGenerationType: null, updatedAt: now }
  })
}

async function saveSafetyScreening(openid, event, trace) {
  trace.stage = 'validate_safety_screening'
  if (!Number.isInteger(event.expectedPortraitVersion) || event.expectedPortraitVersion < 1) return failure('INVALID_PARAM', '画像版本无效')
  const validation = validateSafetyScreeningInput(event.safetyScreening)
  if (validation.errors) return failure(validation.code || 'INVALID_PARAM', validation.code === 'SAFETY_SCREENING_INCOMPLETE' ? '请完成全部安全信息并勾选确认' : '安全信息填写有误', { fieldErrors: validation.errors })
  const context = await loadContext(openid, trace)
  if (context.error) return context.error
  if (!isCompleteProfile(context.profile) || !context.portrait) return failure('PORTRAIT_INCOMPLETE', '请先完成身体档案和用户画像')
  const currentVersion = Number.isInteger(context.portrait.portraitVersion) ? context.portrait.portraitVersion : 0
  if (event.expectedPortraitVersion !== currentVersion) return failure('PORTRAIT_VERSION_CONFLICT', '画像已更新，请重新加载')
  const now = db.serverDate()
  const screening = { ...validation.value, safetyScreeningVersion: SAFETY_SCREENING_VERSION, safetyScreeningAnsweredAt: now }
  trace.stage = 'evaluate_safety_screening'
  const eligibilityStatus = evaluatePlanEligibility(context.profile, context.portrait, screening)
  trace.stage = 'update_safety_screening'
  const result = await db.collection(PORTRAIT_COLLECTION).where({ _id: context.portrait._id, _openid: openid, portraitVersion: currentVersion }).update({
    data: { safetyScreening: db.command.set(screening), planEligibilityStatus: eligibilityStatus, portraitVersion: currentVersion + 1, updatedAt: now }
  })
  if (!result.stats || result.stats.updated !== 1) return failure('PORTRAIT_VERSION_CONFLICT', '画像已更新，请重新加载')
  trace.stage = 'pause_plan_for_safety'
  await pausePlanForSafety(openid, eligibilityStatus)
  return { ok: true, portraitVersion: currentVersion + 1, planEligibilityStatus: eligibilityStatus, safetyScreening: screening }
}

exports.main = async (event = {}) => {
  const action = Object.values(USER_PORTRAIT_ACTIONS).includes(event && event.action) ? event.action : 'unsupported'
  const trace = { stage: 'identity', userTag: 'unavailable' }
  const eventKeys = event && typeof event === 'object' ? Object.keys(event) : []
  console.info('userPortrait request', { action, contractVersion: CONTRACT_VERSION, eventKeys, stage: 'received' })
  try {
    const { OPENID } = cloud.getWXContext()
    if (OPENID) trace.userTag = createHash('sha256').update(`fitflight-portrait:${OPENID}`).digest('hex').slice(0, 16)
    if (!OPENID) {
      console.warn('userPortrait request', { action, eventKeys, code: 'UNAUTHORIZED', stage: 'identity' })
      return failure('UNAUTHORIZED', '无法确认用户身份')
    }
    trace.stage = 'request_validation'
    const requestValidation = validateRequest(event)
    if (!requestValidation.ok) {
      console.warn('userPortrait request', { action, eventKeys, code: requestValidation.code, stage: 'request_validation' })
      return failure(requestValidation.code, requestValidation.message)
    }
    let result
    if (event.action === USER_PORTRAIT_ACTIONS.GET) result = await getPortrait(OPENID, trace)
    else if (event.action === USER_PORTRAIT_ACTIONS.SAVE) result = await savePortrait(OPENID, event, trace)
    else if (event.action === USER_PORTRAIT_ACTIONS.SAVE_SAFETY_SCREENING) result = await saveSafetyScreening(OPENID, event, trace)
    else result = failure('UNSUPPORTED_ACTION', '不支持的操作')
    console.info('userPortrait result', { action, ...trace, code: result.ok ? 'OK' : result.code, contractVersion: CONTRACT_VERSION })
    return result
  } catch (error) {
    console.error('userPortrait request', {
      action,
      cloudCode: String((error && (error.errCode || error.code)) || 'UNKNOWN').slice(0, 64),
      code: 'SERVER_ERROR',
      contractVersion: CONTRACT_VERSION,
      ...trace,
      // 数据库错误可能带文档片段；仅保留结构性错误描述，剔除值与身份。
      cloudMessage: sanitizeDatabaseError(error)
    })
    return failure('SERVER_ERROR', '画像服务暂时不可用，请稍后重试')
  }
}

function sanitizeDatabaseError(error) {
  return String((error && (error.errMsg || error.message)) || 'UNKNOWN')
    .replace(/\{[\s\S]*$/g, '[document redacted]')
    .replace(/o[A-Za-z0-9_-]{20,}/g, '[identity redacted]')
    .replace(/https?:\/\/\S+/g, '[url redacted]')
    .slice(0, 500)
}

module.exports.buildStoredPortrait = buildStoredPortrait
