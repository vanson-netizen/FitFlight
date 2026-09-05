const assert = require('assert')
const fs = require('fs')
const { applyToggle, emptyCheckin, publicCheckin, validateGetInput, validateToggleInput, checkinDocumentId, isDateKey, hasDayPlan } = require('../cloudfunctions/trainingPlan/daily-checkin')
const { validateRequestFields } = require('../cloudfunctions/trainingPlan/request-validator')
const { beijingDateKey } = require('../utils/beijing-date')

function toggle(record, item, completed, expectedRevision) {
  assert.strictEqual(record.revision, expectedRevision, '版本冲突必须拒绝旧写入')
  return applyToggle(record, record.planId, record.date, item, completed)
}

let record = emptyCheckin('plan-a', '2026-09-02')
assert.deepStrictEqual(publicCheckin(null, 'plan-a', '2026-09-02'), record)
record = toggle(record, 'exercise', true, 0)
assert.strictEqual(record.completedCount, 1)
record = toggle(record, 'diet', true, 1)
assert.strictEqual(record.completedCount, 2)
record = toggle(record, 'sleep', true, 2)
assert.strictEqual(record.completedCount, 3)
record = toggle(record, 'exercise', false, 3)
assert.strictEqual(record.completedCount, 2)
assert.strictEqual(record.dietCompleted, true)
assert.strictEqual(record.sleepCompleted, true)

const recoveryCompleted = applyToggle(emptyCheckin('plan-a', '2026-09-03'), 'plan-a', '2026-09-03', 'exercise', true)
assert.strictEqual(recoveryCompleted.exerciseCompleted, true)

const ownedPlan = { _openid: 'user-a', status: 'active', content: { cycleStartDate: '2026-09-01', cycleEndDate: '2026-09-28', dailyPlans: [{ date: '2026-09-02' }] } }
assert.strictEqual(hasDayPlan(ownedPlan, '2026-09-02'), true)
assert.strictEqual(hasDayPlan(ownedPlan, '2026-08-31'), false)
assert.strictEqual(hasDayPlan(ownedPlan, '2026-09-03'), false)
assert.strictEqual(['outdated', 'archived'].includes('outdated'), true)
assert.strictEqual(['outdated', 'archived'].includes('archived'), true)

assert.notStrictEqual(checkinDocumentId('user-a', 'plan-a', '2026-09-02'), checkinDocumentId('user-a', 'plan-a', '2026-09-03'))
assert.notStrictEqual(checkinDocumentId('user-a', 'plan-a', '2026-09-02'), checkinDocumentId('user-a', 'plan-b', '2026-09-02'))
assert.notStrictEqual(checkinDocumentId('user-a', 'plan-a', '2026-09-02'), checkinDocumentId('user-b', 'plan-a', '2026-09-02'))

assert.strictEqual(validateToggleInput({ planId: 'plan-a', date: '2026-09-02', item: 'exercise', completed: true, expectedRevision: 0 }), true)
assert.strictEqual(validateToggleInput({ planId: 'plan-a', date: '2026-09-02', item: 'unknown', completed: true, expectedRevision: 0 }), false)
assert.strictEqual(validateToggleInput({ planId: 'plan-a', date: '2026-09-02', item: 'diet', completed: 1, expectedRevision: 0 }), false)
assert.strictEqual(validateGetInput({ planId: 'plan-a', date: '2026-02-30' }), false)
assert.strictEqual(isDateKey('2026-09-02'), true)

assert.strictEqual(validateRequestFields({ action: 'getDailyCheckin', planId: 'plan-a', date: '2026-09-02', userInfo: {}, tcbContext: {} }).ok, true)
assert.strictEqual(validateRequestFields({ action: 'toggleDailyCheckin', planId: 'plan-a', date: '2026-09-02', item: 'sleep', completed: true, expectedRevision: 0, userInfo: {}, tcbContext: {} }).ok, true)
assert.strictEqual(validateRequestFields({ action: 'toggleDailyCheckin', planId: 'plan-a', date: '2026-09-02', item: 'sleep', completed: true, expectedRevision: 0, extra: true }).ok, false)
assert.strictEqual(validateRequestFields({ action: 'getDailyCheckin', planId: 'plan-a', date: '2026-09-02', _openid: 'forged' }).ok, false)

assert.strictEqual(beijingDateKey(new Date('2026-09-01T15:59:59.999Z')), '2026-09-01')
assert.strictEqual(beijingDateKey(new Date('2026-09-01T16:00:00.000Z')), '2026-09-02')

let conflictCaught = false
try { toggle(record, 'exercise', true, 2) } catch (error) { conflictCaught = true }
assert.strictEqual(conflictCaught, true)

const store = new Map()
function save(user, planId, date, item, completed, expectedRevision) {
  const key = checkinDocumentId(user, planId, date)
  const current = store.get(key) || emptyCheckin(planId, date)
  if (current.revision !== expectedRevision) throw Object.assign(new Error('conflict'), { code: 'CHECKIN_VERSION_CONFLICT' })
  const next = applyToggle(current, planId, date, item, completed)
  store.set(key, next)
  return next
}
save('user-a', 'plan-a', '2026-09-02', 'exercise', true, 0)
save('user-a', 'plan-a', '2026-09-02', 'diet', true, 1)
assert.strictEqual(store.size, 1, '同一用户、方案和日期只能形成一条记录')
save('user-a', 'plan-a', '2026-09-03', 'exercise', true, 0)
save('user-a', 'plan-b', '2026-09-02', 'exercise', true, 0)
save('user-b', 'plan-a', '2026-09-02', 'exercise', true, 0)
assert.strictEqual(store.size, 4, '日期、方案和用户必须相互隔离')
assert.throws(() => save('user-a', 'plan-a', '2026-09-02', 'sleep', true, 1), (error) => error.code === 'CHECKIN_VERSION_CONFLICT')
assert.strictEqual(store.get(checkinDocumentId('user-a', 'plan-a', '2026-09-02')).sleepCompleted, false)

const cloudSource = fs.readFileSync(require.resolve('../cloudfunctions/trainingPlan/index'), 'utf8')
const pageSource = fs.readFileSync(require.resolve('../pages/cultivation/cultivation'), 'utf8')
const pageWxml = fs.readFileSync('pages/cultivation/cultivation.wxml', 'utf8')
const pageWxss = fs.readFileSync('pages/cultivation/cultivation.wxss', 'utf8')
assert.match(cloudSource, /cloud\.getWXContext\(\)/)
assert.match(cloudSource, /_openid: openid, currentPlanId: event\.planId, planStatus: PLAN_STATUS\.ACTIVE/)
assert.match(cloudSource, /completedCount: next\.completedCount/)
assert.match(pageSource, /checkin: previous/)
assert.match(pageSource, /CHECKIN_VERSION_CONFLICT/)
assert.match(pageSource, /checkinRequestId !== this\.checkinRequestId/)
assert.strictEqual((pageWxml.match(/class="card-checkin /g) || []).length, 3, '三项打卡应共用同一按钮结构')
assert.strictEqual((pageWxml.match(/bindtap="toggleCheckin"/g) || []).length, 3)
assert.strictEqual((pageWxml.match(/处理中…/g) || []).length, 3)
assert.strictEqual((pageWxml.match(/✓ 已完成/g) || []).length, 3)
assert.ok(!pageWxml.includes('check-placeholder'), '动作列表不应保留无功能圆圈')
assert.ok(!pageWxml.includes('checkin-button'), '卡片底部不应保留大型打卡按钮')
assert.match(pageWxss, /\.card-checkin \{[^}]*width: auto;[^}]*min-width: 132rpx;[^}]*height: 48rpx;[^}]*flex: none;/)
assert.ok(!pageWxss.includes('.check-placeholder') && !pageWxss.includes('.checkin-button'))

console.log('daily check-in tests passed')
