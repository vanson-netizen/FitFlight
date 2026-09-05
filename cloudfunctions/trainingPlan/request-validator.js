const IDENTITY_FIELDS = ['openid', 'openId', '_openid', 'ownerOpenId', 'userId']
// 已通过云端键名日志确认这些字段由微信运行环境附加；只忽略字段名，绝不用于身份判断。
const SYSTEM_METADATA_FIELDS = ['tcbContext', 'userInfo']
const ACTION_FIELDS = {
  getStatus: ['action'],
  getActivePlan: ['action'],
  getDailyCheckin: ['action', 'planId', 'date'],
  toggleDailyCheckin: ['action', 'planId', 'date', 'item', 'completed', 'expectedRevision'],
  setPortraitAdjustmentPending: ['action'],
  setPendingConfirmation: ['action', 'profileVersion', 'generationType'],
  deferGeneration: ['action', 'profileVersion', 'generationType'],
  requestGeneration: ['action', 'generationType', 'requestId', 'profileVersion', 'portraitVersion'],
  retryGeneration: ['action', 'requestId', 'profileVersion', 'portraitVersion'],
  listCampusResources: ['action', 'type', 'category']
}

function validateRequestFields(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { ok: false, message: '请求参数格式错误', unknownFields: [] }
  }
  const identityFields = IDENTITY_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(event, field))
  if (identityFields.length > 0) {
    return { ok: false, message: '请求中不允许包含用户身份字段', unknownFields: identityFields }
  }

  const allowedFields = ACTION_FIELDS[event.action]
  const businessFields = Object.keys(event).filter((field) => !SYSTEM_METADATA_FIELDS.includes(field))
  if (!allowedFields) {
    return { ok: false, message: '不支持的操作', unknownFields: businessFields.filter((field) => field !== 'action') }
  }
  const unknownFields = businessFields.filter((field) => !allowedFields.includes(field))
  if (unknownFields.length > 0) {
    return { ok: false, message: '请求包含不支持的字段', unknownFields }
  }
  return { ok: true, unknownFields: [] }
}

module.exports = { ACTION_FIELDS, IDENTITY_FIELDS, SYSTEM_METADATA_FIELDS, validateRequestFields }
