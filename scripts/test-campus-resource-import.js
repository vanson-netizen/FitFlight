const assert = require('assert')
const fs = require('fs')
const { parseCsvBuffer, ID_PATTERN, buildResources, compare } = require('./campus-resource-import/core')
const { matchVenue, matchFood } = require('../cloudfunctions/trainingPlan/resource-matcher')
const { loadOrEmpty } = require('../cloudfunctions/trainingPlan/campus-resource-repository')

function bomCsv(text) { return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]) }
function rows() {
  const venueRows = parseCsvBuffer(bomCsv('校区,场地名称,校内或校外,场地类别,具体位置,支持的运动,现有器材,室内或室外,开放时间,是否预约,预约方式,收费说明,信息来源,确认日期,备注\n学院路,测试场地,校内,田径场,测试位置,跑步、跑步、散步,,室外,无,否,无,免费,学生整理,2026-9-3,\n'))
  const hallRows = parseCsvBuffer(bomCsv('校区,食堂名称,楼层,具体位置,早餐时间,午餐时间,晚餐时间,夜宵时间,是否有清真餐饮,信息来源,确认日期,备注\n学院路,测试餐厅,1,测试位置,无,11:00-14:00,无,无,未知,学生整理,2026-09-03,\n学院路,蔓味轻食,不适用,线上外卖,,,,,,学生整理,2026-09-03,供应时间：08:30-22:10；校外轻食商家/外卖商家\n沙河,蔓味轻食,不适用,线上外卖,,,,,,学生整理,2026-09-03,供应时间：09:00-21:00；校外轻食商家/外卖商家\n'))
  const foodRows = parseCsvBuffer(bomCsv('校区,校内/校外,堂食/外卖,食堂名称,楼层,菜品名称,供应餐次,主食,蔬菜,蛋白质来源,烹饪方式,价格说明,热量k,供应时间或星期,信息来源,确认日期,备注\n学院路,校内,堂食,测试餐厅,1,测试餐,午餐,粗粮/粗粮,水煮菜,鸡蛋,水煮,10-20/人,400-600kcal,与食堂相同,学生整理,2026-09-03,\n学院路,校外,外卖,蔓味轻食,不适用,测试轻食,午餐,粗粮,水煮菜,鸡蛋,水煮,20,根据自身挑选,无,学生整理,2026-09-03,\n'))
  return { venueRows, hallRows, foodRows }
}

async function run() {
  assert.throws(() => parseCsvBuffer(Buffer.from('a,b\n1,2')), /UTF-8 with BOM/)
  const first = buildResources({ ...rows(), dataVersion: 'test-v1' }); const second = buildResources({ ...rows(), dataVersion: 'test-v1' })
  assert.strictEqual(first.errors.length, 0); assert.strictEqual(first.blocked.length, 0)
  const all = Object.values(first.collections).flat(); assert.ok(all.every((item) => ID_PATTERN.test(item._id))); assert.deepStrictEqual(all.map((item) => item._id), Object.values(second.collections).flat().map((item) => item._id))
  assert.deepStrictEqual(all.map((item) => item.contentHash), Object.values(second.collections).flat().map((item) => item.contentHash))
  assert.strictEqual(first.collections.campus_venues[0].capabilityTags.includes('running_track'), true); assert.strictEqual(first.collections.campus_venues[0].supportedActivities.length, 2)
  const food = first.collections.campus_food_options[0]; assert.strictEqual(food.nutrition.estimatedKcal, null); assert.strictEqual(food.priceCny, null); assert.strictEqual(food.priceText, '10-20/人'); assert.strictEqual(food.campus, first.collections.campus_dining_halls[0].campus)
  const merchant = first.collections.campus_dining_halls.find((item) => item.campus === 'xueyuan_road' && item.name === '蔓味轻食')
  const externalFood = first.collections.campus_food_options.find((item) => item.diningHallName === '蔓味轻食')
  assert.strictEqual(merchant.entityType, 'external_merchant'); assert.strictEqual(merchant.floor, null); assert.strictEqual(merchant.insideOrOutsideCampus, 'outside'); assert.strictEqual(merchant.openHoursText, '08:30-22:10')
  assert.strictEqual(merchant.diningHallId, 'dining-xueyuan-road-manwei-light-meal'); assert.strictEqual(externalFood.floorOrStall, null); assert.strictEqual(externalFood.diningHallId, merchant.diningHallId)
  assert.notStrictEqual(externalFood.diningHallId, first.collections.campus_dining_halls.find((item) => item.campus === 'shahe' && item.name === '蔓味轻食').diningHallId)
  const wrongFloor = rows(); wrongFloor.foodRows[0]['楼层'] = '2'; assert.strictEqual(buildResources({ ...wrongFloor, dataVersion: 'test-v1' }).blocked.length, 1)
  assert.strictEqual(compare(all, all).unchanged.length, all.length); assert.strictEqual(compare(all, []).insert.length, all.length)
  assert.strictEqual(require('./campus-resource-import/core').contentHash({ value: 1, dataVersion: 'v1' }), require('./campus-resource-import/core').contentHash({ value: 1, dataVersion: 'v2' }))
  const verified = JSON.parse(JSON.stringify(first)); Object.values(verified.collections).flat().forEach((item) => { item.status = 'verified'; item.verifiedAt = '2026-09-03'; item.validUntil = '2026-12-31' })
  const resources = { resourceDataVersion: 'test-v1', venues: verified.collections.campus_venues, diningHalls: verified.collections.campus_dining_halls, foodOptions: verified.collections.campus_food_options }
  const portrait = { trainingConditions: { exercisePreferences: { value: ['running'] } }, trainingGoal: { value: 'maintain' } }
  assert.strictEqual(matchVenue({ campus: 'xueyuan_road', portrait, planDate: '2026-09-04', resources }).status, 'matched')
  assert.strictEqual(matchVenue({ campus: 'shahe', portrait, planDate: '2026-09-04', resources }).status, 'no_match')
  assert.strictEqual(matchFood({ campus: 'xueyuan_road', mealPeriod: 'lunch', requiredFoodGroupTags: ['粗粮'], planDate: '2026-09-04', resources }).status, 'matched')
  assert.deepStrictEqual(await loadOrEmpty({ load: async () => { throw new Error('db failed') } }), require('../cloudfunctions/trainingPlan/campus-resource-repository').EMPTY_RESOURCES)
  assert.ok(fs.readFileSync('services/community-resource-service.js', 'utf8').includes('campusResourceRepository.loadCommunityResources'))
  const release = require('../cloudfunctions/campusResourceAdmin/buaa-resources-student-v1.json')
  const released = Object.values(release.collections).flat()
  assert.strictEqual(released.length, 23); assert.ok(released.every((item) => item.status === 'verified' && item.verifiedAt === '2026-09-03' && item.validUntil === '2026-12-02' && item.curatedBy === 'student'))
  assert.deepStrictEqual(release.counts, { campus_venues: 9, campus_dining_halls: 10, campus_food_options: 4 })
  const adminSource = fs.readFileSync('cloudfunctions/campusResourceAdmin/index.js', 'utf8')
  assert.ok(adminSource.includes("CAMPUS_RESOURCE_APPLY_ENABLED !== 'true'")); assert.ok(adminSource.includes('openid !== adminOpenId')); assert.ok(adminSource.includes("cloud.init({ env: TARGET_ENV })")); assert.ok(!adminSource.includes('event.resources'))
  console.log('Campus resource import, idempotency, matching and fallback tests passed.')
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
