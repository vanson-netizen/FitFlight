const { PORTRAIT_ERROR_CODES } = require('../constants/user-portrait')
const { USER_PORTRAIT_ACTIONS } = require('../constants/user-portrait-actions')

function normalizeError(error) {
  const result = error && error.result
  if (result && result.code) {
    const knownCode = PORTRAIT_ERROR_CODES[result.code]
    const normalized = new Error(knownCode ? (result.message || '画像服务暂时不可用，请稍后重试') : '画像服务暂时不可用，请稍后重试')
    normalized.code = knownCode || PORTRAIT_ERROR_CODES.SERVER_ERROR
    normalized.fieldErrors = result.fieldErrors || {}
    return normalized
  }
  const message = error && error.errMsg ? error.errMsg : ''
  const isNetworkError = (error && error.errCode === -1) || /network|timeout/i.test(message)
  const normalized = new Error(isNetworkError ? '网络连接失败，请检查网络后重试' : '画像服务暂时不可用，请稍后重试')
  normalized.code = isNetworkError ? PORTRAIT_ERROR_CODES.NETWORK_ERROR : PORTRAIT_ERROR_CODES.SERVER_ERROR
  return normalized
}

function callUserPortrait(data) {
  console.info('userPortrait request', { action: data.action, eventKeys: Object.keys(data), stage: 'request' })
  return wx.cloud.callFunction({ name: 'userPortrait', data }).then(({ result }) => {
    if (!result || result.ok !== true) throw { result }
    console.info('userPortrait request', { action: data.action, eventKeys: Object.keys(data), stage: 'success' })
    return result
  }).catch((error) => {
    const normalized = normalizeError(error)
    console.warn('userPortrait request', { action: data.action, eventKeys: Object.keys(data), code: normalized.code, stage: 'failure' })
    throw normalized
  })
}

function getPortrait() {
  return callUserPortrait({ action: USER_PORTRAIT_ACTIONS.GET })
}

function savePortrait(form, expectedPortraitVersion) {
  return callUserPortrait({
    action: USER_PORTRAIT_ACTIONS.SAVE,
    expectedPortraitVersion,
    portrait: {
      campus: form.campus,
      trainingGoal: form.trainingGoal,
      trainingConditions: {
        availableDaysPerWeek: form.availableDaysPerWeek,
        sessionDurationMinutes: form.sessionDurationMinutes,
        experienceLevel: form.experienceLevel,
        equipmentAccess: form.equipmentAccess,
        exercisePreferences: [...form.exercisePreferences]
      },
      safetyConditions: { exerciseLimitationStatus: form.exerciseLimitationStatus }
    }
  })
}

function saveSafetyScreening(safetyScreening, expectedPortraitVersion) {
  return callUserPortrait({ action: USER_PORTRAIT_ACTIONS.SAVE_SAFETY_SCREENING, safetyScreening, expectedPortraitVersion })
}

module.exports = { getPortrait, savePortrait, saveSafetyScreening }
