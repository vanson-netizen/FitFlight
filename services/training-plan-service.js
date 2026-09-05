const { PLAN_ERROR_CODES } = require('../constants/training-plan')

function normalizeError(error) {
  const result = error && error.result
  if (result && result.code) {
    const cloudError = new Error(result.message || '方案服务暂时不可用，请稍后重试')
    cloudError.code = PLAN_ERROR_CODES[result.code] || PLAN_ERROR_CODES.SERVER_ERROR
    cloudError.planStatus = result.planStatus
    return cloudError
  }

  const message = error && error.errMsg ? error.errMsg : ''
  const isNetworkError = (error && error.errCode === -1) || /network|timeout/i.test(message)
  const normalized = new Error(isNetworkError ? '网络连接失败，请检查网络后重试' : '方案服务暂时不可用，请稍后重试')
  normalized.code = isNetworkError ? PLAN_ERROR_CODES.NETWORK_ERROR : PLAN_ERROR_CODES.SERVER_ERROR
  return normalized
}

function callTrainingPlanFunction(data) {
  return wx.cloud.callFunction({ name: 'trainingPlan', data }).then(({ result }) => {
    if (!result || result.ok !== true) throw { result }
    return result
  }).catch((error) => {
    throw normalizeError(error)
  })
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function getPlanStatus() {
  return callTrainingPlanFunction({ action: 'getStatus' })
}

function getActivePlan() {
  return callTrainingPlanFunction({ action: 'getActivePlan' })
}

function getDailyCheckin(planId, date) {
  return callTrainingPlanFunction({ action: 'getDailyCheckin', planId, date })
}

function toggleDailyCheckin(planId, date, item, completed, expectedRevision) {
  return callTrainingPlanFunction({ action: 'toggleDailyCheckin', planId, date, item, completed, expectedRevision })
}

function setPendingConfirmation(profileVersion, generationType) {
  return callTrainingPlanFunction({ action: 'setPendingConfirmation', profileVersion, generationType })
}

function setPortraitAdjustmentPending() {
  return callTrainingPlanFunction({ action: 'setPortraitAdjustmentPending' })
}

function deferGeneration(profileVersion, generationType) {
  return callTrainingPlanFunction({ action: 'deferGeneration', profileVersion, generationType })
}

function requestGeneration(generationType, requestId = createRequestId(), versions = {}) {
  return callTrainingPlanFunction({ action: 'requestGeneration', generationType, requestId, profileVersion: versions.profileVersion, portraitVersion: versions.portraitVersion })
}

function retryGeneration(requestId = createRequestId(), versions = {}) {
  return callTrainingPlanFunction({ action: 'retryGeneration', requestId, profileVersion: versions.profileVersion, portraitVersion: versions.portraitVersion })
}

module.exports = {
  createRequestId,
  getPlanStatus,
  getActivePlan,
  getDailyCheckin,
  toggleDailyCheckin,
  setPortraitAdjustmentPending,
  setPendingConfirmation,
  deferGeneration,
  requestGeneration,
  retryGeneration
}
