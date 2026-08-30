const ERROR_CODES = {
  INVALID_PARAM: 'INVALID_PARAM',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PROFILE_VERSION_CONFLICT: 'PROFILE_VERSION_CONFLICT',
  PROFILE_DATA_CONFLICT: 'PROFILE_DATA_CONFLICT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
}

function normalizeCloudError(error) {
  const result = error && error.result

  if (result && result.code) {
    const cloudError = new Error(result.message || '服务暂时不可用，请稍后重试')
    cloudError.code = ERROR_CODES[result.code] || ERROR_CODES.SERVER_ERROR
    cloudError.fieldErrors = result.fieldErrors || {}
    return cloudError
  }

  const message = error && error.errMsg ? error.errMsg : ''
  const networkError = (error && error.errCode === -1) || /network|timeout/i.test(message)
  const normalizedError = new Error(networkError ? '网络连接失败，请检查网络后重试' : '保存失败，请稍后重试')
  normalizedError.code = networkError ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.SERVER_ERROR
  return normalizedError
}

function callBodyProfileFunction(data) {
  return wx.cloud.callFunction({
    name: 'saveBodyProfile',
    data
  }).then(({ result }) => {
    if (!result || result.ok !== true) throw { result }
    return result
  }).catch((error) => {
    throw normalizeCloudError(error)
  })
}

function getBodyProfile() {
  return callBodyProfileFunction({ action: 'get' })
}

function saveBodyProfile(profile, expectedVersion) {
  // 只发送身体信息白名单；服务端身份始终来自 cloud.getWXContext()。
  const bodyProfile = {
    gender: profile.gender,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel
  }

  return callBodyProfileFunction({
    action: 'save',
    profile: bodyProfile,
    expectedVersion
  })
}

module.exports = {
  ERROR_CODES,
  getBodyProfile,
  saveBodyProfile
}
