function normalizeError(error) {
  const result = error && error.result
  if (result && result.code) { const value = new Error(result.message || '健康记录服务暂时不可用'); value.code = result.code; return value }
  const message = (error && error.errMsg) || ''
  const value = new Error(/network|timeout/i.test(message) ? '网络连接失败，请检查网络后重试' : '健康记录服务暂时不可用，请稍后重试')
  value.code = /network|timeout/i.test(message) ? 'NETWORK_ERROR' : 'SERVER_ERROR'
  return value
}
function call(data) { return wx.cloud.callFunction({ name: 'healthRecord', data }).then(({ result }) => { if (!result || result.ok !== true) throw { result }; return result }).catch((error) => { throw normalizeError(error) }) }
function listRecords() { return call({ action: 'listRecords' }) }
function getRecord(recordDate) { return call({ action: 'getRecord', recordDate }) }
function saveRecord(record) { return call({ action: 'saveRecord', recordDate: record.recordDate, weightKg: record.weightKg, sleepHours: record.sleepHours, energyLevel: record.energyLevel, bodyFeeling: record.bodyFeeling, note: record.note, version: record.version }) }
module.exports = { normalizeError, listRecords, getRecord, saveRecord }
