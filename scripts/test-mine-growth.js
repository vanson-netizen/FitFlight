const assert = require('assert')
const fs = require('fs')
const path = require('path')
const growth = require('../utils/fifi-growth')
const { buildModel } = require('../services/fifi-growth-service')
const { ACHIEVEMENT_CONFIG } = require('../constants/fifi')

const record = (date, exerciseStatus = 'pending', dietCompleted = false, sleepCompleted = false) => ({ date, exerciseStatus, dietCompleted, sleepCompleted })
const records = [
  record('2026-08-30', 'completed'),
  record('2026-08-31', 'scheduled_rest'),
  record('2026-09-01', 'user_paused', true),
  record('2026-09-02', 'completed', true, true)
]

const model = buildModel(records, '2026-09-02', 'success')
const sharedSummary = growth.buildGrowthSummary(records, '2026-09-02')
assert.strictEqual(model.totalPoints, sharedSummary.totalPoints, '我的与FIFI必须共用总积分结果')
assert.strictEqual(model.streak, sharedSummary.streak, '我的与FIFI必须共用连续天数结果')
assert.deepStrictEqual(model.achievements, sharedSummary.achievements, '我的与FIFI必须共用成就结果')
assert.deepStrictEqual(model.achievementCatalog, growth.buildAchievementCatalog(records), '成就页必须使用共享成就目录')
assert.strictEqual(model.cultivationDays, 4, '当天至少完成一项即累计一天')
assert.strictEqual(model.streak, 4, '跨月日期应连续计算')

const recent = growth.buildRecentSevenDays(records, '2026-09-02')
assert.strictEqual(recent.days.length, 7)
assert.strictEqual(recent.days[4].date, '2026-08-31')
assert.strictEqual(recent.days[4].exerciseCompleted, true, 'scheduled_rest沿用FIFI锻炼完成口径')
assert.strictEqual(recent.days[5].exerciseCompleted, false, 'user_paused不能算锻炼完成')
assert.strictEqual(recent.days[5].dietCompleted, true, 'user_paused不应抹掉真实饮食完成项')
assert.strictEqual(recent.completionPercent, 29)

assert.strictEqual(growth.calculateStreak([record('2026-02-28', 'completed'), record('2026-03-01', 'completed')], '2026-03-01'), 2)
assert.strictEqual(growth.calculateStreak([record('2024-02-28', 'completed'), record('2024-02-29', 'completed'), record('2024-03-01', 'completed')], '2024-03-01'), 3)

const empty = buildModel([], '2026-09-02', 'empty')
assert.strictEqual(empty.cultivationDays, 0)
assert.strictEqual(empty.streak, 0)
assert.deepStrictEqual(empty.achievements, [])
assert.strictEqual(empty.recentSevenDays.completionPercent, 0)
assert.strictEqual(empty.achievementCatalog.length, 5)
assert(empty.achievementCatalog.every((achievement) => achievement.unlocked === false))
assert(ACHIEVEMENT_CONFIG.every((achievement) => !Object.hasOwn(achievement, 'iconPath')))

const root = path.resolve(__dirname, '..')
const pageSource = fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(root, 'pages/index/index.wxml'), 'utf8')
assert.match(pageSource, /fifiGrowthService\.loadFifiGrowthData\(\)/)
assert.match(pageSource, /onShow\(\)[\s\S]*this\.loadGrowth\(\)/)
for (const state of ['loading', 'empty', 'error', 'ready']) assert(wxml.includes(`growthStatus === '${state}'`))
assert(!wxml.includes('— 天'), '成长区域不能继续展示占位天数')
assert(!wxml.includes('最近7天'), '首页必须移除最近7天图表')
assert(!wxml.includes('近7天完成度'), '首页必须移除近7天完成度')
assert(wxml.includes('累计培养天数'))
assert(wxml.includes('当前连续天数'))
assert(wxml.includes('本周完成率'))
assert(wxml.includes('growthModel.homeAchievements'))
assert(wxml.includes('bindtap="openAchievements"'))

let pageDefinition
global.Page = (definition) => { pageDefinition = definition }
global.wx = { showToast() {}, navigateTo() {}, saveFile() {} }
global.getApp = () => ({ globalData: {} })
delete require.cache[require.resolve('../pages/index/index.js')]
require('../pages/index/index.js')
const { buildHomeAchievementSlots } = require('../pages/index/index.js')
assert.strictEqual(buildHomeAchievementSlots([]).length, 0)
assert(buildHomeAchievementSlots([]).every((achievement) => achievement.unlocked === false))
assert.strictEqual(buildHomeAchievementSlots(model.achievements.slice(0, 1)).filter((achievement) => achievement.unlocked).length, 1)
assert.strictEqual(buildHomeAchievementSlots(model.achievements).length, 2)
let growthReloads = 0
const page = {
  ...pageDefinition,
  data: { ...pageDefinition.data, isLoading: false, isEditing: false, userProfile: { nickName: '测试用户', avatarUrl: 'avatar' } },
  setData(update) { Object.assign(this.data, update) },
  loadBodyProfile() {},
  loadGrowth() { growthReloads += 1 }
}
page.onShow()
page.onShow()
assert.strictEqual(growthReloads, 2, '每次重新进入“我的”页面都必须重新读取成长记录')

let openedRoute = ''
global.wx.navigateTo = ({ url }) => { openedRoute = url }
page.openAchievements()
assert.strictEqual(openedRoute, '/pages/achievements/achievements')

const achievementPageSource = fs.readFileSync(path.join(root, 'pages/achievements/achievements.js'), 'utf8')
const achievementWxml = fs.readFileSync(path.join(root, 'pages/achievements/achievements.wxml'), 'utf8')
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
assert(app.pages.includes('pages/achievements/achievements'))
assert.match(achievementPageSource, /fifiGrowthService\.loadFifiGrowthData\(\)/)
assert.match(achievementPageSource, /onShow\(\)[\s\S]*this\.loadAchievements\(\)/)
for (const state of ['loading', 'empty', 'error', 'ready']) assert(achievementWxml.includes(`pageStatus === '${state}'`))
assert(achievementWxml.includes('wx:for="{{achievements}}"'))
assert(achievementWxml.includes('selectedAchievement.condition'))

let achievementPageDefinition
global.Page = (definition) => { achievementPageDefinition = definition }
delete require.cache[require.resolve('../pages/achievements/achievements.js')]
require('../pages/achievements/achievements.js')
let achievementReloads = 0
const achievementPage = { ...achievementPageDefinition, loadAchievements() { achievementReloads += 1 } }
achievementPage.onShow()
achievementPage.onShow()
assert.strictEqual(achievementReloads, 2, '每次重新进入成就页都必须重新读取打卡推导结果')

const sameDayAchievements = growth.calculateAchievements([record('2026-09-03', 'completed', true, true)])
assert.deepStrictEqual(sameDayAchievements.map((achievement) => achievement.key), ['first_meeting', 'perfect_day'], '同日解锁必须按成就配置顺序稳定排序')

console.log('mine growth tests passed')
