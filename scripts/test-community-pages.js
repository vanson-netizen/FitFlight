const assert = require('assert')
const fs = require('fs')
const { COMMUNITY_PAGE_STATUS, VERIFICATION_STATUS, SPORT_CATEGORIES, FOOD_CATEGORIES } = require('../constants/community')
const repository = require('../services/community-resource-service')
const campusResourceRepository = require('../services/campus-resource-repository')

async function run() {
  assert.deepStrictEqual(Object.values(COMMUNITY_PAGE_STATUS), ['loading', 'empty', 'error', 'success'])
  assert.deepStrictEqual(Object.values(VERIFICATION_STATUS), ['pending_verification', 'verified', 'expired'])
  assert.deepStrictEqual(SPORT_CATEGORIES.map((item) => item.label), ['健身房', '球类运动', '游泳', '操场及其他场地'])
  assert.deepStrictEqual(FOOD_CATEGORIES.map((item) => item.label), ['食堂', '健康简餐', '高蛋白选择', '其他餐饮'])
  assert.strictEqual(repository.COMMUNITY_RESOURCE_SOURCE.sports.length, 0)
  assert.strictEqual(repository.COMMUNITY_RESOURCE_SOURCE.food.length, 0)
  assert.strictEqual(repository.COMMUNITY_RESOURCE_SOURCE.posts.length, 0)

  for (const category of SPORT_CATEGORIES) assert.strictEqual((await repository.loadResourceList('sport', category.id, { records: [] })).status, 'empty')
  for (const category of FOOD_CATEGORIES) assert.strictEqual((await repository.loadResourceList('food', category.id, { records: [] })).status, 'empty')
  assert.strictEqual((await repository.loadResourceList('sport', 'unknown')).status, 'error')
  assert.strictEqual((await repository.loadCommunityPosts()).status, 'empty')

  const sample = { resourceId: 'test-only', name: '测试占位', category: 'gym', verificationStatus: 'verified', verifiedAt: '2026-01-01', validUntil: '2026-12-31' }
  const success = await repository.loadResourceList('sport', 'gym', { records: [sample], now: new Date('2026-09-02') })
  assert.strictEqual(success.status, 'success')
  assert.strictEqual(success.items[0].isVerified, true)
  const expired = await repository.loadResourceList('sport', 'gym', { records: [{ ...sample, validUntil: '2026-01-02' }], now: new Date('2026-09-02') })
  assert.strictEqual(expired.items[0].isVerified, false)
  assert.notStrictEqual(expired.items[0].verificationLabel, '已核实')
  const formatted = await repository.loadResourceList('sport', 'gym', { records: [{ ...sample, campus: 'xueyuan_road', insideOrOutsideCampus: 'inside', subcategory: '健身房', address: '测试地址', distanceText: null, openHours: '全天开放', equipmentTags: ['哑铃'], reservationRequired: false, priceText: null }], now: new Date('2026-09-02') })
  assert.strictEqual(formatted.items[0].campusScopeText, '学院路校区 · 校内')
  assert.strictEqual(formatted.items[0].locationText, '健身房 · 测试地址')
  assert.strictEqual(formatted.items[0].accessText, '全天开放')
  assert.ok(!JSON.stringify(formatted.items[0]).includes('"null"'))

  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
  const appSource = fs.readFileSync('app.js', 'utf8')
  assert(appSource.includes("const { CLOUD_ENV_ID } = require('./constants/cloud')"))
  assert(appSource.includes('env: CLOUD_ENV_ID'))
  assert.strictEqual(require('../constants/cloud').CLOUD_ENV_ID, 'cloud1-d2gdhogc6193c3024')
  let cloudCall
  global.wx = { cloud: { callFunction(options) { cloudCall = options; return Promise.resolve({ result: { ok: true, items: [{ category: 'gym' }] } }) } } }
  assert.strictEqual((await campusResourceRepository.loadCommunityResources('sport', 'gym')).length, 1)
  assert.deepStrictEqual(cloudCall, { name: 'trainingPlan', config: { env: 'cloud1-d2gdhogc6193c3024' }, data: { action: 'listCampusResources', type: 'sport', category: 'gym' } })
  const routes = ['pages/community/community', 'pages/community-sport/community-sport', 'pages/community-food/community-food', 'pages/community-forum/community-forum']
  routes.forEach((route) => assert.ok(app.pages.includes(route)))
  const allCommunitySource = routes.flatMap((route) => ['.js', '.json', '.wxml', '.wxss'].map((extension) => fs.readFileSync(route + extension, 'utf8'))).join('\n')
  assert.ok(allCommunitySource.includes('该分类暂无已整理资源，后续补充北航校内外场地。'))
  assert.ok(allCommunitySource.includes('还没有校园分享'))
  assert.ok(!/北航体育馆|北航游泳馆|具体食堂|kcal|公里|¥/.test(allCommunitySource))
  assert.ok(fs.readFileSync('pages/community/community.wxml', 'utf8').includes('item.backgroundImage'))
  assert.ok(fs.readFileSync('pages/index/index.wxml', 'utf8').includes('bindtap="openCommunity"'))
  assert.ok(fs.readFileSync('pages/cultivation/cultivation.wxml', 'utf8').includes('bindtap="openCommunity"'))
  for (const page of ['pages/community-sport/community-sport', 'pages/community-food/community-food']) {
    const wxml = fs.readFileSync(`${page}.wxml`, 'utf8')
    ;['class="category-nav"', 'class="resource-pane"', 'class="resource-list"', 'scroll-y="{{true}}"', 'enhanced="{{true}}"', 'show-scrollbar="{{true}}"', 'scroll-top="{{resourceScrollTop}}"'].forEach((token) => assert.ok(wxml.includes(token), `${page} missing ${token}`))
    for (const state of ['loading', 'empty', 'error', 'success']) assert.ok(wxml.includes(`pageStatus === '${state}'`), `${page} missing ${state} state`)
    assert.ok(!/{{item\.(campus|insideOrOutsideCampus|distanceText|nutritionText)}}/.test(wxml), `${page} exposes internal or nullable values`)
  }
  const sharedStyle = fs.readFileSync('pages/community-resource/community-resource.wxss', 'utf8')
  assert.ok(sharedStyle.includes('display: flex; flex-direction: row;'))
  assert.ok(!sharedStyle.includes('display: grid'))
  // 滚动容器仍不能依赖百分比高度；图片可填满已确定比例的独立图片区。
  for (const selector of ['resource-layout', 'category-nav', 'resource-pane', 'resource-list']) {
    const rule = sharedStyle.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))[1]
    assert.ok(!rule.includes('height: 100%'))
  }
  console.log('Community page states, categories, routes and empty data boundary passed.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
