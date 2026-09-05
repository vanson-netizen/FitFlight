const cloud = require('wx-server-sdk')
const { validate } = require('./validator')
const { PLAN_STATUS } = require('./plan-status')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const COLLECTION_NAME = 'body_profiles'
const PLAN_STATE_COLLECTION_NAME = 'training_plan_states'
const PLAN_COLLECTION_NAME = 'training_plans'
const PROFILE_FIELDS = ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']
// 后续身体表单增加方案相关字段时，只需在此处集中扩展。
const PLAN_RELEVANT_FIELDS = ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']
const IDENTITY_FIELDS = ['openid', 'openId', '_openid', 'ownerOpenId', 'userId']

function pickProfile(record) {
  return PROFILE_FIELDS.reduce((profile, field) => {
    profile[field] = record[field] === undefined ? null : record[field]
    return profile
  }, {})
}

function getProfileVersion(record) {
  return Number.isInteger(record.profileVersion) && record.profileVersion > 0 ? record.profileVersion : 1
}

function isCompleteProfile(record) {
  if (!record) return false
  return !validate(pickProfile(record)).errors
}

function profilesEqual(current, next) {
  return PROFILE_FIELDS.every((field) => current[field] === next[field])
}

function failure(code, message, extra = {}) {
  return { ok: false, code, message, ...extra }
}

async function findCurrentProfile(collection, openid) {
  const result = await collection.where({ _openid: openid }).limit(2).get()
  if (result.data.length > 1) {
    return { error: failure('PROFILE_DATA_CONFLICT', '身体档案存在异常，请联系支持人员') }
  }
  return { record: result.data[0] || null }
}

async function getActivePlanStatus(openid) {
  const result = await db.collection(PLAN_STATE_COLLECTION_NAME).where({ _openid: openid }).limit(2).get()
  if (result.data.length > 1) return { error: failure('PLAN_STATE_CONFLICT', '方案状态存在异常，请联系支持人员') }
  const state = result.data[0]
  if (!state || !state.currentPlanId) return { status: PLAN_STATUS.NONE, state: null }
  return { status: state.planStatus === PLAN_STATUS.OUTDATED ? PLAN_STATUS.OUTDATED : PLAN_STATUS.ACTIVE, state }
}

function targetDirection(weight, target) {
  if (!Number.isFinite(Number(target)) || Number(target) === Number(weight)) return 'same'
  return Number(target) < Number(weight) ? 'loss' : 'gain'
}

async function evaluatePlanImpact(openid, state, nextProfile, changedFields) {
  if (!state || !state.currentPlanId) return { shouldPrompt: false, reasons: [] }
  const result = await db.collection(PLAN_COLLECTION_NAME).where({ _id: state.currentPlanId, _openid: openid }).limit(1).get()
  const snapshot = result.data[0] && result.data[0].content && result.data[0].content.profileSnapshot
  if (!snapshot) return { shouldPrompt: false, reasons: [] }
  const reasons = []
  if (changedFields.includes('weightKg') && Math.abs(Number(nextProfile.weightKg) - Number(snapshot.currentWeightKg)) >= 5) reasons.push('weightKg')
  if (changedFields.includes('targetWeightKg')) {
    const directionChanged = targetDirection(snapshot.currentWeightKg, snapshot.targetWeightKg) !== targetDirection(nextProfile.weightKg, nextProfile.targetWeightKg)
    const bothNumeric = Number.isFinite(Number(nextProfile.targetWeightKg)) && nextProfile.targetWeightKg !== null && Number.isFinite(Number(snapshot.targetWeightKg)) && snapshot.targetWeightKg !== null
    if (directionChanged || (bothNumeric && Math.abs(Number(nextProfile.targetWeightKg) - Number(snapshot.targetWeightKg)) >= 3)) reasons.push('targetWeightKg')
  }
  if (changedFields.includes('activityLevel')) reasons.push('activityLevel')
  return { shouldPrompt: reasons.length > 0, reasons }
}

async function getBodyProfile(collection, openid) {
  const lookup = await findCurrentProfile(collection, openid)
  if (lookup.error) return lookup.error
  if (!lookup.record) {
    return { ok: true, exists: false, isComplete: false, profileVersion: 0, profile: null }
  }

  return {
    ok: true,
    exists: true,
    isComplete: isCompleteProfile(lookup.record),
    profileVersion: getProfileVersion(lookup.record),
    profile: pickProfile(lookup.record)
  }
}

async function saveBodyProfile(collection, openid, event) {
  const isActionRequest = event && event.action === 'save'
  const profileInput = isActionRequest ? event.profile : event
  const expectedVersion = isActionRequest ? Number(event.expectedVersion) : null

  if (isActionRequest && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    return failure('INVALID_PARAM', '档案版本无效', { fieldErrors: { form: '请重新加载身体档案' } })
  }

  const validation = validate(profileInput)
  if (validation.errors) {
    return failure('INVALID_PARAM', '身体信息填写有误', { fieldErrors: validation.errors })
  }

  const lookup = await findCurrentProfile(collection, openid)
  if (lookup.error) return lookup.error
  const planState = await getActivePlanStatus(openid)
  if (planState.error) return planState.error
  const existing = lookup.record
  const currentVersion = existing ? getProfileVersion(existing) : 0

  if (isActionRequest && expectedVersion !== currentVersion) {
    return failure('PROFILE_VERSION_CONFLICT', '身体档案已在其他页面更新，请重新加载')
  }

  const value = validation.value
  if (existing && profilesEqual(pickProfile(existing), value)) {
    return {
      ok: true,
      profileVersion: currentVersion,
      isFirstCompletion: false,
      planRelevantChanged: false,
      activePlanStatus: planState.status,
      changedFields: []
    }
  }

  const now = db.serverDate()
  const changedFields = existing
    ? PROFILE_FIELDS.filter((field) => pickProfile(existing)[field] !== value[field])
    : PROFILE_FIELDS.filter((field) => value[field] !== null)
  const profileVersion = currentVersion + 1
  const isFirstCompletion = !isCompleteProfile(existing)
  const planImpact = await evaluatePlanImpact(openid, planState.state, value, changedFields)
  const planRelevantChanged = planImpact.shouldPrompt

  if (!existing) {
    await collection.add({
      data: { ...value, _openid: openid, profileVersion, createdAt: now, updatedAt: now }
    })
  } else if (Number.isInteger(existing.profileVersion) && existing.profileVersion > 0) {
    const result = await collection.where({
      _id: existing._id,
      _openid: openid,
      profileVersion: currentVersion
    }).update({ data: { ...value, profileVersion, updatedAt: now } })
    if (!result.stats || result.stats.updated !== 1) {
      return failure('PROFILE_VERSION_CONFLICT', '身体档案已在其他页面更新，请重新加载')
    }
  } else {
    // 旧记录先以条件写入建立版本 1，避免并发页面把已经升级的数据重新覆盖。
    const migration = await collection.where({
      _id: existing._id,
      _openid: openid,
      profileVersion: _.exists(false)
    }).update({ data: { profileVersion: currentVersion } })
    if (!migration.stats || migration.stats.updated !== 1) {
      return failure('PROFILE_VERSION_CONFLICT', '身体档案已在其他页面更新，请重新加载')
    }

    const result = await collection.where({
      _id: existing._id,
      _openid: openid,
      profileVersion: currentVersion
    }).update({ data: { ...value, profileVersion, updatedAt: now } })
    if (!result.stats || result.stats.updated !== 1) {
      return failure('PROFILE_VERSION_CONFLICT', '身体档案已在其他页面更新，请重新加载')
    }
  }

  if (planImpact.shouldPrompt && planState.state) {
    await db.collection(PLAN_STATE_COLLECTION_NAME).doc(planState.state._id).update({ data: { planStatus: 'pending_confirmation', pendingProfileVersion: profileVersion, pendingGenerationType: 'adjustment', updatedAt: db.serverDate() } })
  }

  return {
    ok: true,
    profileVersion,
    isFirstCompletion,
    planRelevantChanged,
    changedFields,
    planImpactReasons: planImpact.reasons,
    activePlanStatus: planState.status
  }
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return failure('UNAUTHORIZED', '无法确认用户身份')
    if (IDENTITY_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(event, field))) {
      return failure('INVALID_PARAM', '请求中不允许包含用户身份字段')
    }

    const collection = db.collection(COLLECTION_NAME)
    if (event.action === 'get') return await getBodyProfile(collection, OPENID)
    if (event.action && event.action !== 'save') return failure('INVALID_PARAM', '不支持的操作')
    return await saveBodyProfile(collection, OPENID, event)
  } catch (error) {
    // 不向页面返回数据库错误、调用栈、记录 ID 或用户身份。
    console.error('body profile operation failed', { code: error && error.errCode ? error.errCode : 'UNKNOWN' })
    return failure('SERVER_ERROR', '服务暂时不可用，请稍后重试')
  }
}
