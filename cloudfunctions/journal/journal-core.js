const crypto = require('crypto')

const NOTEBOOK_COLLECTION = 'journal_notebooks'
const ENTRY_COLLECTION = 'journal_entries'
const MAX_NOTEBOOKS = 20
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/
const ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/
const FORBIDDEN_IDENTITY_FIELDS = new Set(['_openid', 'openid', 'openId', 'userId', 'ownerOpenId'])
// 微信云函数运行时会附加这些字段；只忽略字段名，身份仍只来自 getWXContext().OPENID。
const SYSTEM_METADATA_FIELDS = new Set(['userInfo', 'tcbContext'])
const ALLOWED_FIELDS = Object.freeze({
  listNotebooks: ['action'],
  createNotebook: ['action', 'title', 'requestId'],
  renameNotebook: ['action', 'notebookId', 'title', 'version'],
  listEntries: ['action', 'notebookId'],
  getEntry: ['action', 'notebookId', 'entryId'],
  saveEntry: ['action', 'notebookId', 'entryId', 'title', 'content', 'version', 'requestId']
})

function codePointLength(value) { return Array.from(value).length }
function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function validId(value) { return typeof value === 'string' && ID_PATTERN.test(value) }
function validRequestId(value) { return typeof value === 'string' && REQUEST_ID_PATTERN.test(value) }
function validVersion(value, allowZero = false) { return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0) }
function normalizeNotebookTitle(value) { return typeof value === 'string' ? value.trim() : '' }
function normalizeEntryTitle(value) { return typeof value === 'string' ? value.trim() : '' }

function validateRequest(event) {
  if (!isPlainObject(event) || typeof event.action !== 'string' || !ALLOWED_FIELDS[event.action]) return { error: 'INVALID_PARAM' }
  const keys = Object.keys(event)
  if (keys.some((key) => FORBIDDEN_IDENTITY_FIELDS.has(key)) || keys.some((key) => !SYSTEM_METADATA_FIELDS.has(key) && !ALLOWED_FIELDS[event.action].includes(key))) return { error: 'INVALID_PARAM' }

  const value = { action: event.action }
  if (event.action === 'createNotebook' || event.action === 'renameNotebook') {
    value.title = normalizeNotebookTitle(event.title)
    if (!value.title || codePointLength(value.title) > 30) return { error: 'INVALID_PARAM' }
  }
  if (['renameNotebook', 'listEntries', 'getEntry', 'saveEntry'].includes(event.action)) {
    if (!validId(event.notebookId)) return { error: 'INVALID_PARAM' }
    value.notebookId = event.notebookId
  }
  if (event.action === 'getEntry' || (event.action === 'saveEntry' && event.entryId !== undefined && event.entryId !== null && event.entryId !== '')) {
    if (!validId(event.entryId)) return { error: 'INVALID_PARAM' }
    value.entryId = event.entryId
  }
  if (event.action === 'createNotebook' || event.action === 'saveEntry') {
    if (!validRequestId(event.requestId)) return { error: 'INVALID_PARAM' }
    value.requestId = event.requestId
  }
  if (event.action === 'renameNotebook') {
    if (!validVersion(event.version)) return { error: 'INVALID_PARAM' }
    value.version = event.version
  }
  if (event.action === 'saveEntry') {
    value.title = normalizeEntryTitle(event.title)
    value.content = typeof event.content === 'string' ? event.content : ''
    value.version = event.version === undefined ? 0 : event.version
    if (codePointLength(value.title) > 50 || !value.content.trim() || codePointLength(value.content) > 5000) return { error: 'INVALID_PARAM' }
    if (!validVersion(value.version, !value.entryId) || (value.entryId && value.version < 1)) return { error: 'INVALID_PARAM' }
  }
  return { value }
}

function stableDocumentId(prefix, openid, requestId, scope = '') {
  const digest = crypto.createHash('sha256').update(`${openid}\n${scope}\n${requestId}`).digest('hex').slice(0, 40)
  return `${prefix}_${digest}`
}

function notebookDocumentId(openid, requestId) { return stableDocumentId('jn', openid, requestId) }
function entryDocumentId(openid, notebookId, requestId) { return stableDocumentId('je', openid, requestId, notebookId) }

function publicNotebook(record) {
  if (!record) return null
  return { _id: record._id, title: record.title, entryCount: Number(record.entryCount) || 0, version: Number(record.version) || 1, status: record.status, createdAt: record.createdAt || null, updatedAt: record.updatedAt || null }
}

function publicEntry(record) {
  if (!record) return null
  return { _id: record._id, notebookId: record.notebookId, title: record.title || '', content: record.content || '', version: Number(record.version) || 1, createdAt: record.createdAt || null, updatedAt: record.updatedAt || null }
}

module.exports = {
  NOTEBOOK_COLLECTION,
  ENTRY_COLLECTION,
  MAX_NOTEBOOKS,
  FORBIDDEN_IDENTITY_FIELDS,
  SYSTEM_METADATA_FIELDS,
  validateRequest,
  notebookDocumentId,
  entryDocumentId,
  publicNotebook,
  publicEntry,
  codePointLength
}
