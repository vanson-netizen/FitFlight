const { CLOUD_ENV_ID } = require('../constants/cloud')

function loadCommunityResources(type, category) {
  if (typeof wx === 'undefined' || !wx.cloud) return Promise.reject(new Error('当前环境不支持云资源读取'))
  console.info('[community-resources] request', { env: CLOUD_ENV_ID, action: 'listCampusResources', type, category })
  return wx.cloud.callFunction({ name: 'trainingPlan', config: { env: CLOUD_ENV_ID }, data: { action: 'listCampusResources', type, category } }).then(({ result, requestID }) => {
    console.info('[community-resources] response', { type, category, requestID, ok: !!result && result.ok === true, itemCount: result && Array.isArray(result.items) ? result.items.length : null, diagnostics: result && result.diagnostics })
    if (!result || result.ok !== true) {
      const error = new Error(result && result.message ? result.message : '校园资源读取失败')
      error.code = result && result.code ? result.code : 'INVALID_RESPONSE'
      throw error
    }
    if (!Array.isArray(result.items)) throw Object.assign(new Error('资源返回格式异常，请重试'), { code: 'INVALID_RESPONSE' })
    return result.items
  }).catch((error) => {
    console.error('[community-resources] failure', { type, category, code: error && (error.code || error.errCode) })
    if (error && error.code) throw error
    const message = error && error.errMsg ? error.errMsg : ''
    const normalized = new Error(/env|environment/i.test(message) ? '云环境连接失败，请重新扫码进入后重试' : /network|timeout/i.test(message) ? '网络连接失败，请检查网络后重试' : '校园资源读取失败，请稍后重试')
    normalized.code = error && error.errCode ? String(error.errCode) : 'CLOUD_CALL_FAILED'
    throw normalized
  })
}
module.exports = { loadCommunityResources }
