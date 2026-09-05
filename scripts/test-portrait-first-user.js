const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')

// 内存数据库仅测试调用分支、身份隔离和错误定位，不代表线上数据库验证。
const tables = { body_profiles: [], user_portraits: [], training_plan_states: [], training_plans: [] }
const operations = []
const logs = []
  let identity = 'fixture-new-user'
  let failOperation = ''
  const db = {
  command: {
    exists: (value) => ({ exists: value }),
    set: (value) => ({ set: value })
  },
  serverDate: () => new Date('2026-09-05T00:00:00Z'),
  collection(name) {
    function query(filter = {}) {
      const matches = () => tables[name].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value))
      return {
        where: query,
        limit() { return this },
        async get() {
          if (failOperation === `${name}.get`) throw Object.assign(new Error('database query failed'), { errCode: -502001 })
          return { data: matches().map(row => ({ ...row })) }
        },
        async add({ data }) {
          assert.ok(!Object.hasOwn(data, '_id'), '新文档 data 不得带 _id')
          assert.strictEqual(data._openid, identity)
          operations.push(`${name}.add`)
          tables[name].push({ ...data, _id: `fixture-${tables[name].length}` })
          return { _id: tables[name].at(-1)._id }
        },
        async update({ data }) {
          assert.strictEqual(filter._openid, identity)
          assert.ok(!Object.hasOwn(data, '_id'))
          if (failOperation === `${name}.update`) {
            throw Object.assign(new Error("Cannot create field 'painOrInjuryStatus' in element {safetyScreening: null}"), { errCode: -502001 })
          }
          const rows = matches()
          operations.push(`${name}.update`)
          rows.forEach(row => {
            const normalized = {}
            Object.entries(data).forEach(([key, value]) => {
              normalized[key] = value && typeof value === 'object' && Object.keys(value).length === 1 && Object.prototype.hasOwnProperty.call(value, 'set') ? value.set : value
            })
            Object.assign(row, normalized)
          })
          return { stats: { updated: rows.length } }
        }
      }
    }
    return query()
  }
}
function loadCloud(name) {
  const filename = path.resolve(__dirname, `../cloudfunctions/${name}/index.js`)
  const localRequire = createRequire(filename)
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, exports: module.exports,
    console: Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (...args) => logs.push(args)])),
    require: id => id === 'wx-server-sdk' ? { init() {}, database: () => db, getWXContext: () => ({ OPENID: identity }) } : localRequire(id)
  }, { filename })
  return module.exports.main
}

async function main() {
  const profileMain = loadCloud('saveBodyProfile')
  const portraitMain = loadCloud('userPortrait')
  assert.strictEqual((await portraitMain({ action: 'getPortrait' })).portraitStatus, 'incomplete')
  // 省略非必填的目标体重，且不存在档案、画像、方案或筛查记录。
  const profile = { gender: 'female', birthDate: '2000-01-01', heightCm: 165, weightKg: 60, activityLevel: 'light' }
  assert.strictEqual((await profileMain({ action: 'save', expectedVersion: 0, profile })).ok, true)
  assert.strictEqual((await portraitMain({ action: 'getPortrait' })).portraitStatus, 'not_generated')
  const portrait = {
    campus: 'unknown', trainingGoal: 'fitness_improvement',
    trainingConditions: { availableDaysPerWeek: 3, sessionDurationMinutes: 30, experienceLevel: 'beginner', equipmentAccess: 'bodyweight', exercisePreferences: ['walking'] },
    safetyConditions: { exerciseLimitationStatus: 'none' }
  }
  const first = await portraitMain({ action: 'savePortrait', expectedPortraitVersion: 0, portrait })
  assert.strictEqual(first.ok, true)
  assert.strictEqual(first.portrait.portraitVersion, 1)
  assert.strictEqual(first.planEligibilityStatus, 'incomplete', '未筛查不得放行方案')
  assert.deepStrictEqual(operations, ['body_profiles.add', 'user_portraits.add'])
  assert.strictEqual((await portraitMain({ action: 'getPortrait' })).portraitStatus, 'complete')
  assert.strictEqual((await portraitMain({ action: 'savePortrait', expectedPortraitVersion: 1, portrait })).ok, true)
  assert.strictEqual(operations.at(-1), 'user_portraits.update')
  assert.strictEqual((await portraitMain({ action: 'getPortrait', _openid: 'fixture-other-user' })).code, 'INVALID_PARAM')
  identity = 'fixture-other-user'
  assert.strictEqual((await portraitMain({ action: 'getPortrait' })).portraitStatus, 'incomplete')
  identity = 'fixture-new-user'
  const { SAFETY_STATUS_FIELDS } = require('../cloudfunctions/userPortrait/safety-screening')
  const safetyScreening = { ...Object.fromEntries(SAFETY_STATUS_FIELDS.map(field => [field, 'none'])), safetyAcknowledged: true }
  const screened = await portraitMain({ action: 'saveSafetyScreening', expectedPortraitVersion: 2, safetyScreening })
  assert.strictEqual(screened.ok, true)
  assert.ok(Number.isInteger(screened.portraitVersion) && screened.portraitVersion >= 2)
  assert.strictEqual(tables.user_portraits[0].portraitVersion, screened.portraitVersion)
  assert.ok(tables.user_portraits[0].safetyScreening && tables.user_portraits[0].safetyScreening.safetyAcknowledged === true)
  failOperation = 'body_profiles.get'
  await portraitMain({ action: 'getPortrait' })
  assert.strictEqual(logs.at(-1)[1].stage, 'query_body_profile')
  failOperation = ''
  assert.strictEqual((await portraitMain({ action: 'saveSafetyScreening', expectedPortraitVersion: 2, safetyScreening: {} })).code, 'SAFETY_SCREENING_INCOMPLETE')

  const { showCloudErrorFeedback } = require('../utils/cloud-error-feedback')
  let modal
  let clipboard
  global.wx = { showModal: options => { modal = options }, setClipboardData: options => { clipboard = options.data } }
  const error = Object.assign(new Error('private server detail'), { code: 'SERVER_ERROR', requestId: 'fixture-request-id' })
  showCloudErrorFeedback(error, 'userPortrait', 'saveSafetyScreening')
  assert.ok(modal.content.includes('fixture-request-id'))
  modal.success({ confirm: true })
  assert.ok(clipboard.includes('saveSafetyScreening'))
  assert.ok(!clipboard.includes('private server detail'))
  delete global.wx
  console.log('First-user cloud branch, identity, safety gate, failure-stage and copy checks passed (mock database).')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
