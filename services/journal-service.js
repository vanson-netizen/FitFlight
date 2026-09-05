const ERROR_MESSAGES = Object.freeze({
  INVALID_PARAM: '请检查填写内容',
  UNAUTHORIZED: '无法确认当前用户，请重新进入小程序',
  NOTEBOOK_NOT_FOUND: '日志本不存在或已不可用',
  ENTRY_NOT_FOUND: '日志不存在或已不可用',
  VERSION_CONFLICT: '内容已在其他页面更新',
  LIMIT_EXCEEDED: '日志本数量已达上限',
  SERVER_ERROR: '日志服务暂时不可用，请稍后重试'
})

function normalizeError(error) {
  const result = error && error.result
  if (result && result.code) {
    const normalized = new Error(result.message || ERROR_MESSAGES[result.code] || ERROR_MESSAGES.SERVER_ERROR)
    normalized.code = result.code
    return normalized
  }
  const message = (error && error.errMsg) || ''
  const normalized = new Error(/network|timeout/i.test(message) ? '网络连接失败，请检查网络后重试' : ERROR_MESSAGES.SERVER_ERROR)
  normalized.code = /network|timeout/i.test(message) ? 'NETWORK_ERROR' : 'SERVER_ERROR'
  return normalized
}

function callJournal(data) {
  return wx.cloud.callFunction({ name: 'journal', data }).then(({ result }) => {
    if (!result || result.ok !== true) throw { result }
    return result
  }).catch((error) => { throw normalizeError(error) })
}

function createRequestId() {
  return `journal_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

function listNotebooks() { return callJournal({ action: 'listNotebooks' }) }
function createNotebook(title, requestId) { return callJournal({ action: 'createNotebook', title, requestId }) }
function renameNotebook(notebookId, title, version) { return callJournal({ action: 'renameNotebook', notebookId, title, version }) }
function listEntries(notebookId) { return callJournal({ action: 'listEntries', notebookId }) }
function getEntry(notebookId, entryId) { return callJournal({ action: 'getEntry', notebookId, entryId }) }
function saveEntry({ notebookId, entryId, title, content, version, requestId }) {
  const data = { action: 'saveEntry', notebookId, title, content, version, requestId }
  if (entryId) data.entryId = entryId
  return callJournal(data)
}

function dateValue(value) {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && value.$date) return new Date(value.$date)
  return new Date(value)
}

function formatDateTime(value) {
  const date = dateValue(value)
  if (Number.isNaN(date.getTime())) return '时间暂不可用'
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function entryDisplayTitle(entry) {
  if (entry.title) return entry.title
  const date = dateValue(entry.updatedAt || entry.createdAt)
  if (!Number.isNaN(date.getTime())) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return '未命名日志'
}

module.exports = { ERROR_MESSAGES, normalizeError, createRequestId, listNotebooks, createNotebook, renameNotebook, listEntries, getEntry, saveEntry, formatDateTime, entryDisplayTitle }
