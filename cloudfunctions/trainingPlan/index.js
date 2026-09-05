const cloud = require('wx-server-sdk')
const { PLAN_STATUS } = require('./plan-status')
const planGenerator = require('./plan-generator')
const { validateRequestFields } = require('./request-validator')
const { evaluatePlanEligibility } = require('./plan-eligibility')
const { evaluateSafetyGate } = require('./safety-gate')
const { createRepository } = require('./campus-resource-repository')
const { CHECKIN_COLLECTION, validateGetInput, validateToggleInput, publicCheckin, applyToggle, checkinDocumentId, hasDayPlan } = require('./daily-checkin')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const PROFILE_COLLECTION = 'body_profiles'
const PLAN_COLLECTION = 'training_plans'
const STATE_COLLECTION = 'training_plan_states'
const PORTRAIT_COLLECTION = 'user_portraits'
const GENERATION_TYPES = ['initial', 'adjustment']
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/
const PROFILE_FIELDS = ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']

function failure(code, message, extra = {}) {
  return { ok: false, code, message, ...extra }
}

function publicPlan(record) {
  if (!record) return null
  return {
    planId: record._id,
    profileVersion: record.profileVersion,
    portraitVersion: record.portraitVersion || (record.content && record.content.portraitVersion) || null,
    safetyScreeningVersion: record.safetyScreeningVersion || (record.content && record.content.safetyScreeningVersion) || null,
    ruleVersion: record.ruleVersion,
    exerciseLibraryVersion: record.exerciseLibraryVersion || (record.content && record.content.exerciseLibraryVersion) || null,
    templateVersion: record.templateVersion || (record.content && record.content.templateVersion) || null,
    generatorVersion: record.generatorVersion,
    generationType: record.generationType,
    status: record.status,
    content: record.content || null,
    failureCode: record.failureCode || null,
    generatedAt: record.generatedAt || null
  }
}

function pickProfile(record) {
  return PROFILE_FIELDS.reduce((profile, field) => {
    profile[field] = record[field] === undefined ? null : record[field]
    return profile
  }, {})
}

async function findOne(collection, query) {
  const result = await collection.where(query).limit(2).get()
  if (result.data.length > 1) return { conflict: true }
  return { record: result.data[0] || null }
}

async function getCurrentProfile(collection, openid) {
  const lookup = await findOne(collection, { _openid: openid })
  if (lookup.conflict) return { error: failure('PROFILE_DATA_CONFLICT', '身体档案存在异常，请联系支持人员') }
  const record = lookup.record
  const isComplete = record && ['gender', 'birthDate', 'heightCm', 'weightKg', 'activityLevel'].every((field) => {
    return record[field] !== null && record[field] !== undefined && record[field] !== ''
  })
  if (!isComplete) return { error: failure('PROFILE_INCOMPLETE', '请先完善身体信息') }
  const version = Number.isInteger(lookup.record.profileVersion) && lookup.record.profileVersion > 0 ? lookup.record.profileVersion : 1
  return { record: lookup.record, profileVersion: version }
}

async function getState(collection, openid) {
  const lookup = await findOne(collection, { _openid: openid })
  if (lookup.conflict) return { error: failure('PLAN_STATE_CONFLICT', '方案状态存在异常，请联系支持人员') }
  return { record: lookup.record }
}

async function getCurrentPortrait(openid, profile, profileVersion) {
  const lookup = await findOne(db.collection(PORTRAIT_COLLECTION), { _openid: openid })
  if (lookup.conflict) return { error: failure('PORTRAIT_DATA_CONFLICT', '画像数据存在异常，请联系支持人员') }
  if (!lookup.record || lookup.record.status !== 'complete' || lookup.record.profileVersion !== profileVersion) {
    return { error: failure('PORTRAIT_NEEDS_REGENERATION', '请先生成与当前身体档案一致的画像') }
  }
  const gate = evaluateSafetyGate({ profile, profileVersion, portrait: lookup.record })
  if (gate.decision !== 'eligible') return { error: failure(gate.stableCode, gate.userMessage) }
  return { record: lookup.record }
}

async function loadPublicState(openid) {
  const stateLookup = await getState(db.collection(STATE_COLLECTION), openid)
  if (stateLookup.error) return stateLookup.error
  const state = stateLookup.record
  if (!state) return { ok: true, planStatus: PLAN_STATUS.NONE, activePlan: null }

  let activePlan = null
  let planStatus = state.planStatus || PLAN_STATUS.NONE
  if (state.currentPlanId) {
    const planLookup = await findOne(db.collection(PLAN_COLLECTION), { _id: state.currentPlanId, _openid: openid })
    if (planLookup.conflict || !planLookup.record) return failure('PLAN_STATE_CONFLICT', '当前方案状态异常，请联系支持人员')
    activePlan = publicPlan(planLookup.record)
    // 画像版本变化本身不等于方案失效；保存画像时由属性影响矩阵决定后续状态。
  }
  return { ok: true, planStatus, activePlan }
}

async function loadOwnedPlan(openid, planId, collection = db.collection(PLAN_COLLECTION)) {
  const lookup = await findOne(collection, { _id: planId, _openid: openid })
  if (lookup.conflict || !lookup.record) return { error: failure('PLAN_NOT_FOUND', '未找到当前用户的方案') }
  return { record: lookup.record }
}

async function getDailyCheckin(openid, event) {
  if (!validateGetInput(event)) return failure('INVALID_PARAM', '每日打卡参数无效')
  const planLookup = await loadOwnedPlan(openid, event.planId)
  if (planLookup.error) return planLookup.error
  if (!hasDayPlan(planLookup.record, event.date)) return failure('DAY_PLAN_NOT_FOUND', '方案中不存在该日期的每日安排')
  const lookup = await findOne(db.collection(CHECKIN_COLLECTION), { _openid: openid, planId: event.planId, date: event.date })
  if (lookup.conflict) return failure('SERVER_ERROR', '每日打卡记录存在异常，请联系支持人员')
  const stateLookup = await findOne(db.collection(STATE_COLLECTION), { _openid: openid, currentPlanId: event.planId, planStatus: PLAN_STATUS.ACTIVE })
  const readOnly = planLookup.record.status !== PLAN_STATUS.ACTIVE || stateLookup.conflict || !stateLookup.record
  return { ok: true, checkin: publicCheckin(lookup.record, event.planId, event.date), readOnly }
}

async function toggleDailyCheckin(openid, event) {
  if (!validateToggleInput(event)) return failure('INVALID_PARAM', '每日打卡参数无效')
  return db.runTransaction(async (transaction) => {
    const planResult = await transaction.collection(PLAN_COLLECTION).where({ _id: event.planId, _openid: openid }).limit(2).get()
    if (planResult.data.length !== 1) return failure('PLAN_NOT_FOUND', '未找到当前用户的方案')
    const plan = planResult.data[0]
    if (!hasDayPlan(plan, event.date)) return failure('DAY_PLAN_NOT_FOUND', '方案中不存在该日期的每日安排')
    const stateResult = await transaction.collection(STATE_COLLECTION).where({ _openid: openid, currentPlanId: event.planId, planStatus: PLAN_STATUS.ACTIVE }).limit(2).get()
    if (plan.status !== PLAN_STATUS.ACTIVE || stateResult.data.length !== 1) return failure('PLAN_NOT_ACTIVE', '当前方案不可新增打卡')

    const checkins = transaction.collection(CHECKIN_COLLECTION)
    const existingResult = await checkins.where({ _openid: openid, planId: event.planId, date: event.date }).limit(2).get()
    if (existingResult.data.length > 1) return failure('SERVER_ERROR', '每日打卡记录存在异常，请联系支持人员')
    const existing = existingResult.data[0] || null
    const revision = existing && Number.isInteger(existing.revision) ? existing.revision : 0
    if (revision !== event.expectedRevision) {
      return { ...failure('CHECKIN_VERSION_CONFLICT', '打卡状态已更新，请重新加载'), checkin: publicCheckin(existing, event.planId, event.date) }
    }

    const next = applyToggle(existing, event.planId, event.date, event.item, event.completed)
    const timestamps = { updatedAt: db.serverDate() }
    if (existing) {
      await checkins.doc(existing._id).update({ data: { exerciseCompleted: next.exerciseCompleted, dietCompleted: next.dietCompleted, sleepCompleted: next.sleepCompleted, completedCount: next.completedCount, revision: next.revision, ...timestamps } })
    } else {
      await checkins.doc(checkinDocumentId(openid, event.planId, event.date)).set({ data: { _openid: openid, ...next, createdAt: db.serverDate(), ...timestamps } })
    }
    return { ok: true, checkin: next, readOnly: false }
  })
}

function validateVersion(value) {
  const version = Number(value)
  return Number.isInteger(version) && version > 0 ? version : null
}

async function setPendingConfirmation(openid, event) {
  const profileVersion = validateVersion(event.profileVersion)
  if (!profileVersion || !GENERATION_TYPES.includes(event.generationType)) return failure('INVALID_PARAM', '方案确认参数无效')
  const profile = await getCurrentProfile(db.collection(PROFILE_COLLECTION), openid)
  if (profile.error) return profile.error
  if (profile.profileVersion !== profileVersion) return failure('PROFILE_VERSION_MISMATCH', '身体档案已更新，请重新操作')

  const now = db.serverDate()
  const stateLookup = await getState(db.collection(STATE_COLLECTION), openid)
  if (stateLookup.error) return stateLookup.error
  const state = stateLookup.record
  const generationType = state && state.currentPlanId ? 'adjustment' : 'initial'
  const data = {
    planStatus: PLAN_STATUS.PENDING_CONFIRMATION,
    pendingProfileVersion: profileVersion,
    pendingGenerationType: generationType,
    updatedAt: now
  }
  if (state) await db.collection(STATE_COLLECTION).doc(state._id).update({ data })
  else await db.collection(STATE_COLLECTION).add({ data: { ...data, _openid: openid, currentPlanId: null, createdAt: now } })
  return { ok: true, planStatus: PLAN_STATUS.PENDING_CONFIRMATION }
}

async function deferGeneration(openid, event) {
  const profileVersion = validateVersion(event.profileVersion)
  if (!profileVersion || !GENERATION_TYPES.includes(event.generationType)) return failure('INVALID_PARAM', '方案确认参数无效')
  const profile = await getCurrentProfile(db.collection(PROFILE_COLLECTION), openid)
  if (profile.error) return profile.error
  if (profile.profileVersion !== profileVersion) return failure('PROFILE_VERSION_MISMATCH', '身体档案已更新，请重新操作')

  const stateLookup = await getState(db.collection(STATE_COLLECTION), openid)
  if (stateLookup.error) return stateLookup.error
  const state = stateLookup.record
  if (!state) return { ok: true, planStatus: PLAN_STATUS.NONE }

  const generationType = state.currentPlanId ? 'adjustment' : 'initial'
  const nextStatus = generationType === 'adjustment' ? PLAN_STATUS.OUTDATED : PLAN_STATUS.NONE
  await db.runTransaction(async (transaction) => {
    const states = transaction.collection(STATE_COLLECTION)
    const plans = transaction.collection(PLAN_COLLECTION)
    await states.doc(state._id).update({
      data: {
        planStatus: nextStatus,
        pendingProfileVersion: null,
        pendingGenerationType: null,
        updatedAt: db.serverDate()
      }
    })
    if (nextStatus === PLAN_STATUS.OUTDATED) {
      const planResult = await plans.where({ _id: state.currentPlanId, _openid: openid }).limit(1).get()
      if (!planResult.data[0]) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })
      await plans.doc(planResult.data[0]._id).update({
        data: { status: PLAN_STATUS.OUTDATED, updatedAt: db.serverDate() }
      })
    }
  })
  return { ok: true, planStatus: nextStatus }
}

async function startGeneration(openid, event) {
  if (!GENERATION_TYPES.includes(event.generationType) || typeof event.requestId !== 'string' || !REQUEST_ID_PATTERN.test(event.requestId) || !validateVersion(event.profileVersion) || !validateVersion(event.portraitVersion)) {
    return failure('INVALID_PARAM', '方案生成参数无效')
  }

  const profileLookup = await getCurrentProfile(db.collection(PROFILE_COLLECTION), openid)
  if (profileLookup.error) return profileLookup.error
  const profileVersion = profileLookup.profileVersion
  if (event.profileVersion !== profileVersion) return failure('PROFILE_VERSION_MISMATCH', '身体档案已更新，请重新操作')
  const portraitLookup = await getCurrentPortrait(openid, profileLookup.record, profileVersion)
  if (portraitLookup.error) return portraitLookup.error
  const portraitVersion = portraitLookup.record.portraitVersion
  if (event.portraitVersion !== portraitVersion) return failure('PROFILE_VERSION_MISMATCH', '用户画像已更新，请重新操作')
  const safetyScreeningVersion = portraitLookup.record.safetyScreening.safetyScreeningVersion
  const now = db.serverDate()
  let planId
  let previousPlanId = null
  let duplicateResult = null

  await db.runTransaction(async (transaction) => {
    const plans = transaction.collection(PLAN_COLLECTION)
    const states = transaction.collection(STATE_COLLECTION)
    const requestLookup = await plans.where({ _openid: openid, requestId: event.requestId }).limit(1).get()
    if (requestLookup.data[0]) {
      duplicateResult = publicPlan(requestLookup.data[0])
      return
    }
    const effective = await plans.where({
      _openid: openid,
      profileVersion,
      portraitVersion,
      safetyScreeningVersion,
      ruleVersion: planGenerator.RULE_VERSION,
      exerciseLibraryVersion: planGenerator.EXERCISE_LIBRARY_VERSION,
      templateVersion: planGenerator.TEMPLATE_VERSION,
      status: _.in([PLAN_STATUS.GENERATING, PLAN_STATUS.ACTIVE])
    }).limit(1).get()
    if (effective.data[0]) {
      duplicateResult = publicPlan(effective.data[0])
      return
    }

    const stateResult = await states.where({ _openid: openid }).limit(2).get()
    if (stateResult.data.length > 1) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })
    const state = stateResult.data[0] || null
    previousPlanId = state && state.currentPlanId ? state.currentPlanId : null
    const generationType = previousPlanId ? 'adjustment' : 'initial'
    const added = await plans.add({ data: {
      _openid: openid,
      ownerOpenId: openid,
      profileVersion,
      portraitVersion,
      safetyScreeningVersion,
      ruleVersion: planGenerator.RULE_VERSION,
      ruleReviewStatus: planGenerator.RULE_REVIEW_STATUS,
      generatorVersion: planGenerator.GENERATOR_VERSION,
      generationType,
      requestId: event.requestId,
      status: PLAN_STATUS.GENERATING,
      content: null,
      failureCode: null,
      createdAt: now,
      updatedAt: now,
      generatedAt: null
    } })
    planId = added._id
    const stateData = {
      planStatus: PLAN_STATUS.GENERATING,
      generatingPlanId: planId,
      pendingProfileVersion: null,
      pendingGenerationType: null,
      updatedAt: now
    }
    if (state) await states.doc(state._id).update({ data: stateData })
    else await states.add({ data: { ...stateData, _openid: openid, currentPlanId: null, createdAt: now } })
  })

  if (duplicateResult) return { ok: true, planStatus: duplicateResult.status, plan: duplicateResult, duplicated: true }

  let generationStage = 'generate_content'
  try {
    const content = await planGenerator.generate({
      profile: pickProfile(profileLookup.record),
      portrait: portraitLookup.record,
      profileVersion,
      planId,
      requestId: event.requestId,
      ruleVersion: planGenerator.RULE_VERSION,
      generatorVersion: planGenerator.GENERATOR_VERSION
      ,resourceRepository: createRepository(db)
    })
    generationStage = 'activate_plan'
    await activateGeneratedPlan(openid, planId, previousPlanId, profileVersion, portraitVersion, safetyScreeningVersion, content)
    return await loadPublicState(openid)
  } catch (error) {
    // 仅记录定位所需的阶段和错误元数据，不记录用户身份、画像、方案内容或完整请求。
    console.error('training plan generation failed', {
      stage: generationStage,
      code: error && error.code ? String(error.code) : null,
      errCode: error && error.errCode ? String(error.errCode) : null,
      message: error && error.message ? String(error.message).slice(0, 300) : null
    })
    const knownFailureCodes = ['PLAN_GENERATOR_NOT_CONFIGURED', 'PROFILE_VERSION_MISMATCH', 'PORTRAIT_NEEDS_REGENERATION', 'PROFESSIONAL_GUIDANCE_REQUIRED', 'SAFETY_SCREENING_INCOMPLETE', 'AGE_NOT_SUPPORTED', 'PROFILE_OR_PORTRAIT_INCOMPLETE', 'MINOR_OUT_OF_V1_SCOPE', 'AGE_GROUP_OUT_OF_V1_SCOPE', 'LIMITATION_REQUIRES_CLARIFICATION', 'LIMITATION_REQUIRES_PROFESSIONAL_GUIDANCE', 'PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE', 'MEDICAL_RESTRICTION_OUT_OF_SCOPE', 'MEDICAL_REQUEST_OUT_OF_SCOPE', 'GOAL_DIRECTION_CONFLICT', 'AGGRESSIVE_OR_IMPLAUSIBLE_TARGET', 'INPUT_VERSION_CONFLICT', 'TRAINING_GOAL_UNSUPPORTED', 'TRAINING_FREQUENCY_UNSUPPORTED', 'TRAINING_DURATION_UNSUPPORTED', 'TRAINING_EXPERIENCE_UNSUPPORTED', 'TRAINING_EQUIPMENT_UNSUPPORTED', 'TRAINING_PREFERENCES_INVALID', 'TRAINING_TEMPLATE_NOT_FOUND', 'TRAINING_EXERCISE_NOT_AVAILABLE', 'TRAINING_RULE_CONFIG_INVALID']
    const failureCode = error && knownFailureCodes.includes(error.code) ? error.code : 'PLAN_GENERATION_FAILED'
    const status = failureCode === 'PLAN_GENERATOR_NOT_CONFIGURED'
      ? PLAN_STATUS.GENERATOR_NOT_CONFIGURED
      : PLAN_STATUS.GENERATION_FAILED
    await markGenerationFailed(openid, planId, status, failureCode)
    const message = failureCode === 'PLAN_GENERATOR_NOT_CONFIGURED'
      ? '方案规则正在准备中'
      : failureCode === 'PROFILE_VERSION_MISMATCH'
        ? '身体档案已更新，请重新操作'
        : failureCode === 'PORTRAIT_NEEDS_REGENERATION'
          ? '请先生成与当前身体档案一致的画像'
          : failureCode === 'PROFESSIONAL_GUIDANCE_REQUIRED'
            ? '存在或不确定是否存在运动限制，请先咨询专业人员'
            : failureCode === 'INPUT_VERSION_CONFLICT'
              ? '生成期间画像或安全信息已更新，旧方案保持不变，请重新生成'
              : failureCode === 'GOAL_DIRECTION_CONFLICT' || failureCode === 'AGGRESSIVE_OR_IMPLAUSIBLE_TARGET'
                ? error.message
            : '方案生成失败，请稍后重试'
    return failure(failureCode, message, { planStatus: status })
  }
}

async function activateGeneratedPlan(openid, planId, previousPlanId, profileVersion, portraitVersion, safetyScreeningVersion, content) {
  await db.runTransaction(async (transaction) => {
    const profiles = transaction.collection(PROFILE_COLLECTION)
    const portraits = transaction.collection(PORTRAIT_COLLECTION)
    const plans = transaction.collection(PLAN_COLLECTION)
    const states = transaction.collection(STATE_COLLECTION)
    const profileResult = await profiles.where({ _openid: openid }).limit(1).get()
    const currentProfile = profileResult.data[0]
    const currentVersion = currentProfile && Number.isInteger(currentProfile.profileVersion) ? currentProfile.profileVersion : 1
    if (!currentProfile || currentVersion !== profileVersion) throw Object.assign(new Error('profile version mismatch'), { code: 'PROFILE_VERSION_MISMATCH' })
    const portraitResult = await portraits.where({ _openid: openid, profileVersion, portraitVersion, status: 'complete' }).limit(2).get()
    if (portraitResult.data.length !== 1) throw Object.assign(new Error('portrait changed'), { code: 'PORTRAIT_NEEDS_REGENERATION' })
    if (!portraitResult.data[0].safetyScreening || portraitResult.data[0].safetyScreening.safetyScreeningVersion !== safetyScreeningVersion) throw Object.assign(new Error('safety screening changed'), { code: 'INPUT_VERSION_CONFLICT' })
    const eligibility = evaluatePlanEligibility(currentProfile, portraitResult.data[0])
    if (eligibility === 'incomplete') throw Object.assign(new Error('safety screening incomplete'), { code: 'SAFETY_SCREENING_INCOMPLETE' })
    if (eligibility === 'age_not_supported') throw Object.assign(new Error('age not supported'), { code: 'AGE_NOT_SUPPORTED' })
    if (eligibility !== 'eligible') throw Object.assign(new Error('professional guidance required'), { code: 'PROFESSIONAL_GUIDANCE_REQUIRED' })
    const stateResult = await states.where({ _openid: openid, generatingPlanId: planId }).limit(1).get()
    if (!stateResult.data[0]) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })

    const generatedResult = await plans.where({ _id: planId, _openid: openid, status: PLAN_STATUS.GENERATING }).limit(1).get()
    if (!generatedResult.data[0]) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })
    await plans.doc(generatedResult.data[0]._id).update({
      // 云数据库会把普通对象展开为嵌套字段更新；原值为 null 时必须显式整体替换。
      data: { status: PLAN_STATUS.ACTIVE, content: _.set(content), failureCode: null, generatedAt: db.serverDate(), updatedAt: db.serverDate() }
    })
    if (previousPlanId && previousPlanId !== planId) {
      const previousResult = await plans.where({ _id: previousPlanId, _openid: openid }).limit(1).get()
      if (!previousResult.data[0]) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })
      await plans.doc(previousResult.data[0]._id).update({
        data: { status: PLAN_STATUS.ARCHIVED, updatedAt: db.serverDate() }
      })
    }
    await states.doc(stateResult.data[0]._id).update({
      data: { planStatus: PLAN_STATUS.ACTIVE, currentPlanId: planId, generatingPlanId: null, updatedAt: db.serverDate() }
    })
  })
}

async function markGenerationFailed(openid, planId, status, failureCode) {
  await db.runTransaction(async (transaction) => {
    const plans = transaction.collection(PLAN_COLLECTION)
    const states = transaction.collection(STATE_COLLECTION)
    const planResult = await plans.where({ _id: planId, _openid: openid, status: PLAN_STATUS.GENERATING }).limit(1).get()
    if (!planResult.data[0]) throw Object.assign(new Error('plan state conflict'), { code: 'PLAN_STATE_CONFLICT' })
    await plans.doc(planResult.data[0]._id).update({
      data: { status, failureCode, updatedAt: db.serverDate() }
    })
    const stateResult = await states.where({ _openid: openid, generatingPlanId: planId }).limit(1).get()
    if (stateResult.data[0]) {
      await states.doc(stateResult.data[0]._id).update({
        data: { planStatus: status, generatingPlanId: null, updatedAt: db.serverDate() }
      })
    }
  })
}

async function retryGeneration(openid, event) {
  const stateResult = await loadPublicState(openid)
  if (!stateResult.ok) return stateResult
  const generationType = stateResult.activePlan ? 'adjustment' : 'initial'
  return startGeneration(openid, { ...event, generationType })
}

async function setPortraitAdjustmentPending(openid) {
  const profile = await getCurrentProfile(db.collection(PROFILE_COLLECTION), openid)
  if (profile.error) return profile.error
  const portraitLookup = await findOne(db.collection(PORTRAIT_COLLECTION), { _openid: openid })
  const portrait = portraitLookup.record
  if (portraitLookup.conflict) return failure('PORTRAIT_DATA_CONFLICT', '画像数据存在异常，请联系支持人员')
  if (!portrait || portrait.status !== 'complete' || portrait.profileVersion !== profile.profileVersion) {
    return failure('PORTRAIT_NEEDS_REGENERATION', '画像需要根据最新身体信息重新生成')
  }

  const stateLookup = await getState(db.collection(STATE_COLLECTION), openid)
  if (stateLookup.error) return stateLookup.error
  const state = stateLookup.record
  if (!state || !state.currentPlanId || ![PLAN_STATUS.ACTIVE, PLAN_STATUS.OUTDATED, PLAN_STATUS.PENDING_CONFIRMATION].includes(state.planStatus)) {
    return failure('PLAN_STATE_CONFLICT', '当前没有可调整的方案')
  }
  await db.collection(STATE_COLLECTION).doc(state._id).update({
    data: {
      planStatus: PLAN_STATUS.PENDING_CONFIRMATION,
      pendingProfileVersion: profile.profileVersion,
      pendingGenerationType: 'adjustment',
      updatedAt: db.serverDate()
    }
  })
  return { ok: true, planStatus: PLAN_STATUS.PENDING_CONFIRMATION }
}

async function listCampusResources(event) {
  try {
    const result = await readCampusResources(event)
    if (!result.ok) return result
    // 只统计数量，不输出资源内容或用户身份；统计失败不影响业务读取。
    const counts = await Promise.all(['campus_venues', 'campus_dining_halls', 'campus_food_options'].map(async (name) => {
      try { return (await db.collection(name).count()).total } catch (error) { return null }
    }))
    const diagnostics = {
      version: 'community-resource-diagnostics-v1',
      collections: { venues: counts[0], diningHalls: counts[1], foodOptions: counts[2] },
      beforeCategory: counts[event.type === 'sport' ? 0 : event.category === 'dining_hall' ? 1 : 2],
      afterServerFilter: result.items.length,
      type: event.type, category: event.category
    }
    console.info('[community-resources] cloud', diagnostics)
    return { ...result, diagnostics }
  } catch (error) {
    console.error('[community-resources] cloud failure', { type: event.type, category: event.category, code: error.code || 'SERVER_ERROR' })
    throw error
  }
}

async function readCampusResources(event) {
  if (!['sport', 'food'].includes(event.type) || typeof event.category !== 'string') return failure('INVALID_PARAM', '资源分类参数无效')
  if (event.type === 'sport') {
    const result = await db.collection('campus_venues').where({ category: event.category }).limit(100).get()
    return { ok: true, items: result.data.map((item) => ({ resourceId: item.venueId || item._id, name: item.name, campus: item.campus, insideOrOutsideCampus: item.insideOrOutsideCampus, category: item.category, subcategory: item.subcategory, address: item.locationText, distanceText: null, openHours: item.openHoursText, equipmentTags: item.equipmentTags || [], reservationRequired: item.reservationRequired, priceText: item.priceText, verificationStatus: item.status, verifiedAt: item.verifiedAt, validUntil: item.validUntil, image: item.imageFileId, description: item.description || item.displayNotice })) }
  }
  if (event.category === 'dining_hall') {
    const result = await db.collection('campus_dining_halls').limit(100).get()
    return { ok: true, items: result.data.map((item) => ({ resourceId: item.diningHallId || item._id, entityType: item.entityType, name: item.name, campus: item.campus, insideOrOutsideCampus: item.insideOrOutsideCampus, diningHallId: item.diningHallId, floor: item.floor, locationText: item.locationText, openHoursText: item.openHoursText, mealPeriodText: item.mealPeriodText, halalAvailable: item.halalAvailable, category: 'dining_hall', diningHall: item.name, floorOrWindow: item.floor, mealTypes: Object.entries(item.mealPeriodText || {}).filter(([, value]) => value).map(([key]) => key), foodTags: [], priceText: null, nutritionText: null, verificationStatus: item.status, verifiedAt: item.verifiedAt, validUntil: item.validUntil, image: item.imageFileId, description: item.description || item.displayNotice })) }
  }
  const foods = await db.collection('campus_food_options').where({ category: event.category }).limit(100).get()
  const hallIds = [...new Set(foods.data.map((item) => item.diningHallId).filter(Boolean))]
  const halls = hallIds.length ? await db.collection('campus_dining_halls').where({ diningHallId: _.in(hallIds) }).limit(100).get() : { data: [] }
  const hallById = new Map(halls.data.map((item) => [item.diningHallId, item]))
  return { ok: true, items: foods.data.map((item) => { const hall = hallById.get(item.diningHallId); return { resourceId: item.foodOptionId || item._id, name: item.dishName, campus: item.campus, insideOrOutsideCampus: item.insideOrOutsideCampus, category: item.category, diningHall: hall ? hall.name : item.diningHallName, diningHallId: item.diningHallId, openHoursText: item.openHoursText, supplyDaysText: item.supplyDaysText, parentDiningHall: hall ? { diningHallId: hall.diningHallId, openHoursText: hall.openHoursText, mealPeriodText: hall.mealPeriodText } : null, floorOrWindow: item.floorOrStall, mealTypes: item.mealPeriods || [], foodTags: item.foodTags || [], priceText: item.priceText, nutritionText: null, verificationStatus: item.status, verifiedAt: item.verifiedAt, validUntil: item.validUntil, image: item.imageFileId, description: item.description || item.displayNotice } }) }
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) return failure('UNAUTHORIZED', '无法确认用户身份')
    if (!event || typeof event !== 'object' || Array.isArray(event)) return failure('INVALID_PARAM', '请求参数格式错误')
    const requestValidation = validateRequestFields(event)
    if (!requestValidation.ok) {
      // 联调诊断仅记录字段名称，不记录值、身份或完整请求。
      console.log('training plan request field diagnosis', {
        eventKeys: Object.keys(event),
        unknownFields: requestValidation.unknownFields
      })
      return failure('INVALID_PARAM', requestValidation.message)
    }

    if (event.action === 'getStatus' || event.action === 'getActivePlan') return await loadPublicState(OPENID)
    if (event.action === 'getDailyCheckin') return await getDailyCheckin(OPENID, event)
    if (event.action === 'toggleDailyCheckin') return await toggleDailyCheckin(OPENID, event)
    if (event.action === 'setPortraitAdjustmentPending') return await setPortraitAdjustmentPending(OPENID)
    if (event.action === 'setPendingConfirmation') return await setPendingConfirmation(OPENID, event)
    if (event.action === 'deferGeneration') return await deferGeneration(OPENID, event)
    if (event.action === 'requestGeneration') return await startGeneration(OPENID, event)
    if (event.action === 'retryGeneration') return await retryGeneration(OPENID, event)
    if (event.action === 'listCampusResources') return await listCampusResources(event)
    return failure('INVALID_PARAM', '不支持的操作')
  } catch (error) {
    const stableCode = error && ['PROFILE_VERSION_MISMATCH', 'PLAN_STATE_CONFLICT'].includes(error.code) ? error.code : 'SERVER_ERROR'
    console.error('training plan operation failed', { code: stableCode })
    return failure(stableCode, stableCode === 'PROFILE_VERSION_MISMATCH' ? '身体档案已更新，请重新操作' : '方案服务暂时不可用，请稍后重试')
  }
}
