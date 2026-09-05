const assert = require('assert')
const path = require('path')
const fs = require('fs')
const growth = require('../utils/fifi-growth')
const { buildModel, exerciseStatusFor } = require('../services/fifi-growth-service')

const pending = (date, extra = {}) => ({ date, exerciseStatus: 'pending', dietCompleted: false, sleepCompleted: false, ...extra })
const full = (date) => pending(date, { exerciseStatus: 'completed', dietCompleted: true, sleepCompleted: true })

assert.strictEqual(growth.calculateTotalPoints([]), 0)
assert.strictEqual(growth.calculateStageProgress(0).name, '相遇')
assert.strictEqual(growth.calculateDailyPoints(pending('2026-09-01', { exerciseStatus: 'completed' })), 3)
assert.strictEqual(growth.calculateDailyPoints(pending('2026-09-01', { dietCompleted: true, sleepCompleted: true })), 4)
assert.strictEqual(growth.calculateDailyPoints(full('2026-09-01')), 10)
assert.strictEqual(growth.calculateDailyPoints(pending('2026-09-01', { exerciseStatus: 'scheduled_rest', dietCompleted: true, sleepCompleted: true })), 10)
assert.strictEqual(growth.calculateDailyPoints(pending('2026-09-01', { exerciseStatus: 'user_paused', dietCompleted: true, sleepCompleted: true })), 4)
assert.strictEqual(growth.calculateTotalPoints([full('2026-09-01'), { ...full('2026-09-01'), revision: 2 }]), 10)

;[[20, '相遇'], [21, '熟悉'], [50, '熟悉'], [51, '伙伴'], [89, '伙伴'], [90, '活力搭档']].forEach(([score, name]) => assert.strictEqual(growth.calculateStageProgress(score).name, name))

const sevenDays = Array.from({ length: 7 }, (_, index) => full(`2026-09-0${index + 1}`))
assert.strictEqual(growth.calculateStreak(sevenDays.slice(0, 3), '2026-09-03'), 3)
assert.strictEqual(growth.calculateStreak(sevenDays, '2026-09-07'), 7)
assert.strictEqual(growth.calculateStreak([full('2026-09-01'), full('2026-09-03')], '2026-09-03'), 1)
assert.strictEqual(growth.calculateLatestAchievement(sevenDays).name, '连续7天')
assert.strictEqual(growth.calculateLatestAchievement([...sevenDays, full('2026-09-08'), full('2026-09-09')]).name, '活力搭档')

assert.strictEqual(growth.getTodayPresentation(pending('2026-09-01')).state, 'normal')
assert.strictEqual(growth.getTodayPresentation(pending('2026-09-01', { dietCompleted: true })).state, 'happy')
assert.strictEqual(growth.getTodayPresentation(full('2026-09-01')).state, 'celebrate')
assert.strictEqual(exerciseStatusFor({ dayType: 'recovery' }, null), 'scheduled_rest')
assert.strictEqual(exerciseStatusFor({ dayType: 'training' }, { exerciseStatus: 'user_paused' }), 'user_paused')

const emptyModel = buildModel([], '2026-09-02', 'empty')
assert.strictEqual(emptyModel.totalPoints, 0)
assert.strictEqual(emptyModel.stage.name, '相遇')

const root = path.resolve(__dirname, '..')
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
assert(app.pages.includes('pages/fifi/fifi'))
for (const state of ['normal', 'happy', 'celebrate']) assert(fs.existsSync(path.join(root, `assets/fifi/fifi-${state}.svg`)))
const wxml = fs.readFileSync(path.join(root, 'pages/fifi/fifi.wxml'), 'utf8')
for (const state of ['loading', 'empty', 'error', 'success']) {
  if (state !== 'success') assert(wxml.includes(state))
}
assert(wxml.includes('bindtap="openCultivation"'))

// onShow 必须每次重读，而不是只在首次加载。
let pageDefinition
global.Page = (definition) => { pageDefinition = definition }
global.wx = { redirectTo() {}, showToast() {} }
const service = require('../services/fifi-growth-service')
const originalLoad = service.loadFifiGrowthData
let loadCount = 0
service.loadFifiGrowthData = async () => { loadCount += 1; return emptyModel }
delete require.cache[require.resolve('../pages/fifi/fifi.js')]
require('../pages/fifi/fifi.js')
const page = { ...pageDefinition, data: { ...pageDefinition.data }, setData(update) { Object.assign(this.data, update) } }
Promise.resolve().then(async () => {
  page.onShow(); await Promise.resolve(); await Promise.resolve()
  page.onShow(); await Promise.resolve(); await Promise.resolve()
  assert.strictEqual(loadCount, 2)
  service.loadFifiGrowthData = originalLoad
  console.log('FIFI growth tests passed')
}).catch((error) => { console.error(error); process.exitCode = 1 })
