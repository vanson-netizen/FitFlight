const crypto = require('crypto')

const COLLECTION = 'health_records'
const IDENTITY_FIELDS = new Set(['_openid', 'openid', 'openId', 'userId', 'ownerOpenId'])
const SYSTEM_FIELDS = new Set(['userInfo', 'tcbContext'])
const ACTION_FIELDS = Object.freeze({
  listRecords: ['action'],
  getRecord: ['action', 'recordDate'],
  saveRecord: ['action', 'recordDate', 'weightKg', 'sleepHours', 'energyLevel', 'bodyFeeling', 'note', 'version']
})
const energyValues = new Set(['low', 'normal', 'good'])
const feelingValues = new Set(['normal', 'fatigued', 'sore', 'unwell'])

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  const beijingToday = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= beijingToday
}
function optionalNumber(value, min, max) {
  if (value === null || value === undefined || value === '') return { value: null }
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? { value: Math.round(number * 10) / 10 } : { error: true }
}
function optionalEnum(value, allowed) { return value === null || value === undefined || value === '' ? { value: null } : allowed.has(value) ? { value } : { error: true } }

function validateRequest(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || !ACTION_FIELDS[event.action]) return { error: 'INVALID_PARAM' }
  const keys = Object.keys(event)
  if (keys.some((key) => IDENTITY_FIELDS.has(key)) || keys.some((key) => !SYSTEM_FIELDS.has(key) && !ACTION_FIELDS[event.action].includes(key))) return { error: 'INVALID_PARAM' }
  if (event.action === 'listRecords') return { value: { action: event.action } }
  if (!validDate(event.recordDate)) return { error: 'INVALID_PARAM' }
  if (event.action === 'getRecord') return { value: { action: event.action, recordDate: event.recordDate } }

  const weight = optionalNumber(event.weightKg, 20, 400)
  const sleep = optionalNumber(event.sleepHours, 0, 24)
  const energy = optionalEnum(event.energyLevel, energyValues)
  const feeling = optionalEnum(event.bodyFeeling, feelingValues)
  const note = typeof event.note === 'string' ? event.note.trim() : ''
  if (weight.error || sleep.error || energy.error || feeling.error || Array.from(note).length > 500 || !Number.isInteger(event.version) || event.version < 0) return { error: 'INVALID_PARAM' }
  if ([weight.value, sleep.value, energy.value, feeling.value].every((value) => value === null)) return { error: 'INVALID_PARAM' }
  return { value: { action: event.action, recordDate: event.recordDate, weightKg: weight.value, sleepHours: sleep.value, energyLevel: energy.value, bodyFeeling: feeling.value, note, version: event.version } }
}

function recordDocumentId(openid, recordDate) {
  return `hr_${crypto.createHash('sha256').update(`${openid}\n${recordDate}`).digest('hex').slice(0, 40)}`
}

function publicRecord(record) {
  if (!record) return null
  return { _id: record._id, recordDate: record.recordDate, weightKg: record.weightKg === undefined ? null : record.weightKg, sleepHours: record.sleepHours === undefined ? null : record.sleepHours, energyLevel: record.energyLevel || null, bodyFeeling: record.bodyFeeling || null, note: record.note || '', version: Number(record.version) || 1, createdAt: record.createdAt || null, updatedAt: record.updatedAt || null }
}

module.exports = { COLLECTION, IDENTITY_FIELDS, SYSTEM_FIELDS, validateRequest, recordDocumentId, publicRecord, validDate }
