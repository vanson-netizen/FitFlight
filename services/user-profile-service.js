const ERROR_CODES = {
  INVALID_PARAM: 'INVALID_PARAM',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
}

function normalizeCloudError(error) {
  const result = error && error.result

  if (result && result.code === ERROR_CODES.INVALID_PARAM) {
    const validationError = new Error(result.message || '身体信息填写有误')
    validationError.code = ERROR_CODES.INVALID_PARAM
    validationError.fieldErrors = result.fieldErrors || {}
    return validationError
  }

  const message = error && error.errMsg ? error.errMsg : ''
  const networkError = (error && error.errCode === -1) || /network|timeout/i.test(message)
  const normalizedError = new Error(networkError ? '网络连接失败，请检查网络后重试' : '保存失败，请稍后重试')
  normalizedError.code = networkError ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.SERVER_ERROR
  return normalizedError
}

function saveBodyProfile(profile) {
  // 只发送身体信息白名单；服务端身份始终来自 cloud.getWXContext()。
  const data = {
    gender: profile.gender,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel
  }

  return wx.cloud.callFunction({
    name: 'saveBodyProfile',
    data
  }).then(({ result }) => {
    if (!result || result.ok !== true) {
      throw { result }
    }
    return result.profile
  }).catch((error) => {
    throw normalizeCloudError(error)
  })
}

module.exports = {
  ERROR_CODES,
  saveBodyProfile
}
