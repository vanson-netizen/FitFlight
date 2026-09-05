const assert = require('assert')
const fs = require('fs')
const vm = require('vm')
const { createRequire } = require('module')
const path = require('path')
const { SPORT_CATEGORIES, FOOD_CATEGORIES } = require('../constants/community')
const quiet = { info() {}, log() {}, error() {} }
const filename = path.resolve('cloudfunctions/trainingPlan/index.js')
const localRequire = createRequire(filename)
const sample = { status: 'expired', verifiedAt: null, validUntil: '2000-01-01', campus: 'shahe' }
const collections = {
  campus_venues: SPORT_CATEGORIES.map(({ id }) => ({ ...sample, _id: id, category: id, name: id })),
  campus_dining_halls: [{ ...sample, diningHallId: 'hall', name: 'Test hall' }],
  campus_food_options: FOOD_CATEGORIES.slice(1).map(({ id }) => ({ ...sample, foodOptionId: id, category: id, diningHallId: 'hall' }))
}
let failRead = false
const db = {
  command: { in: (values) => ({ values }) },
  collection(name) {
    let records = collections[name] || []
    return {
      where(filter) { records = records.filter((r) => Object.entries(filter).every(([key, value]) => value.values ? value.values.includes(r[key]) : r[key] === value)); return this },
      limit() { return this },
      async get() { if (failRead) throw new Error('test network failure'); return { data: records } },
      async count() { return { total: records.length } }
    }
  }
}
const sandbox = { exports: {}, console: quiet, require(name) {
  return name === 'wx-server-sdk' ? { init() {}, database: () => db, getWXContext: () => ({ OPENID: 'test-only' }) } : localRequire(name)
} }
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename })

async function run() {
  for (const [type, categories] of [['sport', SPORT_CATEGORIES], ['food', FOOD_CATEGORIES]]) {
    for (const category of categories) {
      const response = await sandbox.exports.main({ action: 'listCampusResources', type, category: category.id })
      assert.strictEqual(response.ok, true)
      assert.strictEqual(response.items.length, 1, 'status, date and campus must not hide community resources')
      assert.strictEqual(response.diagnostics.collections.venues, 4)
      assert.strictEqual(response.diagnostics.afterServerFilter, 1)
    }
  }
  const releasePath = 'cloudfunctions/campusResourceAdmin/buaa-resources-student-v1.json'
  const releaseBytes = fs.readFileSync(releasePath, 'utf8')
  const release = JSON.parse(releaseBytes)
  Object.assign(collections, release.collections)
  const originalRecords = JSON.stringify(collections)
  const community = require('../services/community-resource-service')
  global.wx = { cloud: { callFunction: async ({ data }) => ({ result: await sandbox.exports.main(data) }) } }
  const halls = await community.loadResourceList('food', 'dining_hall')
  assert.strictEqual(halls.items.length, 6, '9 campus floor records become 6 campus dining cards')
  const heyi = halls.items.find((item) => item.name === '合一餐厅')
  assert.deepStrictEqual(heyi.floors, ['2', '3'])
  assert.strictEqual(heyi.sourceDiningHallIds.length, 2)
  assert.strictEqual(heyi.floorDetails.length, 2)
  assert.strictEqual(heyi.openHoursByFloor.length, 2)
  assert.strictEqual(heyi.floorDetails[0].mealPeriodText.breakfast, null)
  assert.strictEqual(heyi.floorDetails[1].mealPeriodText.breakfast, '7:00-10:00')
  assert.strictEqual(heyi.floorDetails[0].halalAvailable, true)
  assert.strictEqual(heyi.diningLocationText, '南区20公寓西侧合一餐厅')
  assert.strictEqual(heyi.verificationLabel, '人工整理、信息仅供参考')
  assert.ok(heyi.mealTypesText.includes('早餐'))
  assert.ok(!/breakfast|lunch|dinner/.test(heyi.mealTypesText))
  assert.ok(!halls.items.some((item) => item.name === '蔓味轻食'))

  const dishes = await community.loadResourceList('food', 'healthy_light_meal')
  const merchant = dishes.items.find((item) => item.cardType === 'merchant')
  assert.strictEqual(merchant.name, '蔓味轻食')
  assert.strictEqual(merchant.description, '提供：减脂餐')
  assert.strictEqual(merchant.campusScopeText, '学院路校区 · 校外')
  assert.strictEqual(merchant.diningLocationText, '线上外卖')
  assert.strictEqual(merchant.effectiveOpenHoursText, '08:30–22:10')
  assert.strictEqual(merchant.openHoursText, '08:30-22:10', 'display formatting must not overwrite source time')
  assert.strictEqual(merchant.verificationLabel, '人工整理、信息仅供参考')
  assert.strictEqual(merchant.foodItems[0].name, '减脂餐')
  assert.strictEqual(merchant.foodItems[0].diningHallId, merchant.diningHallId)
  const dish = dishes.items.find((item) => item.diningHallId === heyi.sourceDiningHallIds[0])
  assert.strictEqual(dish.supplyDaysText, '与食堂相同')
  assert.strictEqual(dish.effectiveOpenHoursText, '午餐 11:00-14:00；晚餐 17:00-20:00')
  const resources = await require('../cloudfunctions/trainingPlan/campus-resource-repository').createRepository(db).load()
  assert.strictEqual(resources.diningHalls.length, 10)
  const match = require('../cloudfunctions/trainingPlan/resource-matcher').matchFood({
    campus: 'xueyuan_road', mealPeriod: 'lunch', planDate: '2026-09-05', resources
  })
  assert.strictEqual(match.status, 'matched')
  assert.strictEqual(match.candidates[0].diningHall.diningHallId, collections.campus_food_options[0].diningHallId)
  assert.strictEqual(match.candidates[0].diningHall.floor, '2')
  assert.strictEqual(JSON.stringify(collections), originalRecords)
  assert.strictEqual(Object.values(collections).flat().length, 23)
  assert.strictEqual(new Set(Object.values(collections).flat().map((item) => item._id)).size, 23)
  assert.strictEqual(fs.readFileSync(releasePath, 'utf8'), releaseBytes)

  const externalFood = collections.campus_food_options.find((food) => food.diningHallId === merchant.diningHallId)
  collections.campus_food_options = [...collections.campus_food_options,
    { ...externalFood, foodOptionId: 'merchant-second', dishName: '鸡肉沙拉', supplyDaysText: null },
    { ...externalFood, foodOptionId: 'merchant-other', dishName: '套餐', category: 'other_food', supplyDaysText: '与食堂相同' },
    { ...externalFood, foodOptionId: 'merchant-protein', dishName: '高蛋白菜', category: 'high_protein' }]
  const multiple = await community.loadResourceList('food', 'healthy_light_meal')
  const merchantCards = multiple.items.filter((item) => item.cardType === 'merchant')
  assert.strictEqual(merchantCards.length, 1)
  assert.strictEqual(merchantCards[0].foodItems.length, 4)
  assert.ok(merchantCards[0].description.includes('鸡肉沙拉'))
  assert.strictEqual(merchantCards[0].foodItems.find((food) => food.resourceId === 'merchant-second').effectiveOpenHoursText, '08:30-22:10')
  assert.strictEqual(merchantCards[0].foodItems.find((food) => food.resourceId === 'merchant-other').effectiveOpenHoursText, '08:30-22:10')
  const other = await community.loadResourceList('food', 'other_food')
  assert.ok(other.items.every((item) => item.diningHallId !== merchant.diningHallId))
  const protein = await community.loadResourceList('food', 'high_protein')
  assert.strictEqual(protein.items[0].name, '高蛋白菜')
  assert.strictEqual(protein.items[0].diningLocationText, '蔓味轻食')

  // 同名跨校区、跨校内外不能合并；空白和全角字符可规范化。
  const base = { ...collections.campus_dining_halls[3], name: '测试Ａ餐厅' }
  collections.campus_dining_halls = [base,
    { ...base, diningHallId: 'floor3', floor: '3', name: ' 测试A餐厅 ' },
    { ...base, diningHallId: 'shahe', campus: 'shahe' },
    { ...base, diningHallId: 'outside', entityType: 'external_merchant', insideOrOutsideCampus: 'outside', floor: null }]
  const grouped = await community.loadResourceList('food', 'dining_hall')
  assert.strictEqual(grouped.items.length, 2)
  assert.deepStrictEqual(grouped.items[0].sourceDiningHallIds, [base.diningHallId, 'floor3'])
  assert.deepStrictEqual(grouped.items[0].floors, ['2', '3'])
  collections.campus_food_options = [{ ...release.collections.campus_food_options[2], diningHallId: 'missing' }]
  const orphan = await community.loadResourceList('food', 'healthy_light_meal')
  assert.strictEqual(orphan.items.length, 1)
  assert.strictEqual(orphan.items[0].effectiveOpenHoursText, '营业时间待确认')
  const { effectiveFoodHours } = require('../services/community-dining-view-model')
  const parentDiningHall = { diningHallId: 'floor2', openHoursText: '11:00-13:00' }
  for (const supplyDaysText of [null, '', '与食堂相同']) {
    assert.strictEqual(effectiveFoodHours({ diningHallId: 'floor2', supplyDaysText, parentDiningHall }), '11:00-13:00')
  }
  assert.strictEqual(effectiveFoodHours({ diningHallId: 'floor3', parentDiningHall }), '营业时间待确认')
  assert.strictEqual(effectiveFoodHours({ openHoursText: '12:00-13:00', supplyDaysText: '与食堂相同', parentDiningHall }), '12:00-13:00')
  assert.strictEqual(effectiveFoodHours({ supplyDaysText: '8:30-22:10', parentDiningHall }), '8:30-22:10')
  console.log('Dining aggregation, exact-floor inheritance, 23 unchanged records and floor-level plan matching passed.')
  failRead = true
  assert.strictEqual((await sandbox.exports.main({ action: 'listCampusResources', type: 'sport', category: 'gym' })).ok, false)

  const repository = require('../services/campus-resource-repository')
  global.wx = { cloud: { callFunction: async () => ({ result: { ok: true } }) } }
  await assert.rejects(repository.loadCommunityResources('sport', 'gym'), { code: 'INVALID_RESPONSE' })
  const service = require('../services/community-resource-service')
  const originalLoad = service.loadResourceList
  for (const type of ['sport', 'food']) {
    let definition
    global.Page = (page) => { definition = page }
    global.wx = { getWindowInfo: () => ({ windowHeight: 568 }), nextTick: (fn) => fn() }
    let requests = []
    service.loadResourceList = () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
    require(`../pages/community-${type}/community-${type}`)
    const page = { ...definition, data: { ...definition.data }, setData(update, callback) { Object.assign(this.data, update); if (callback) callback() } }
    const category = page.data.categories[0].id
    const first = page.loadCategory(category)
    assert.strictEqual(page.data.pageStatus, 'loading')
    const second = page.loadCategory(category)
    requests[1].resolve({ status: 'success', items: [{ resourceId: 'new' }] })
    await second
    requests[0].resolve({ status: 'empty', items: [] })
    await first
    assert.strictEqual(page.data.resources[0].resourceId, 'new', 'stale responses must not replace current category')
    const empty = page.loadCategory(category)
    requests[2].resolve({ status: 'empty', items: [] }); await empty
    assert.strictEqual(page.data.pageStatus, 'empty')
    const failed = page.loadCategory(category)
    requests[3].reject(new Error('test offline')); await failed
    assert.strictEqual(page.data.pageStatus, 'error')
    page.data.resourceScrollTop = 900
    page.resetResourceScroll()
    assert.strictEqual(page.data.resourceScrollTop, 0)
    const pending = page.loadCategory(category)
    page.onUnload()
    requests[4].resolve({ status: 'success', items: [{ resourceId: 'after-unload' }] }); await pending
    assert.strictEqual(page.data.resources.length, 0)
  }
  service.loadResourceList = originalLoad
  delete global.Page
  delete global.wx
  console.log('Community cloud contract, filters, malformed response, four states, races and scroll reset passed.')
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
