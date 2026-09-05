const { COMMUNITY_PAGE_STATUS, VERIFICATION_STATUS, SPORT_CATEGORIES, FOOD_CATEGORIES } = require('../constants/community')
const { MEAL_LABELS, displayText, aggregateDiningHalls, effectiveFoodHours, merchantCard } = require('./community-dining-view-model')
const campusResourceRepository = require('./campus-resource-repository')
const { resourceImage } = require('../constants/community-resource-images')

// 社区资源经统一 repository 调用业务云函数；此空源仅保留给尚未接入的社区帖子。
const COMMUNITY_RESOURCE_SOURCE = Object.freeze({
  version: 'fitflight-community-resources-empty-v1',
  sports: Object.freeze([]),
  food: Object.freeze([]),
  posts: Object.freeze([])
})

const SPORT_RESOURCE_FIELDS = Object.freeze([
  'resourceId', 'name', 'campus', 'insideOrOutsideCampus', 'category', 'subcategory', 'address',
  'distanceText', 'openHours', 'equipmentTags', 'reservationRequired', 'priceText',
  'verificationStatus', 'verifiedAt', 'image', 'description'
])

const FOOD_RESOURCE_FIELDS = Object.freeze([
  'resourceId', 'name', 'campus', 'insideOrOutsideCampus', 'diningHall', 'floorOrWindow',
  'category', 'diningHallId', 'openHoursText', 'supplyDaysText', 'effectiveOpenHoursText',
  'sourceDiningHallIds', 'floors', 'floorDetails', 'mealPeriods', 'openHoursByFloor',
  'cardType', 'sourceFoodOptionIds', 'foodItems',
  'mealTypes', 'foodTags', 'priceText', 'nutritionText', 'verificationStatus', 'verifiedAt', 'image', 'description'
])

function isVerifiedAndCurrent(resource, now = new Date()) {
  if (!resource || resource.verificationStatus !== VERIFICATION_STATUS.VERIFIED || !resource.verifiedAt) return false
  if (!resource.validUntil) return true
  const expiresAt = new Date(resource.validUntil)
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() >= now.getTime()
}

function publicResource(resource, fields, now) {
  const result = fields.reduce((value, field) => {
    value[field] = resource[field] === undefined ? null : resource[field]
    return value
  }, {})
  result.isVerified = isVerifiedAndCurrent(resource, now)
  result.verificationLabel = result.isVerified ? '人工整理' : resource.verificationStatus === VERIFICATION_STATUS.EXPIRED ? '信息已过期' : '待整理'
  result.equipmentTagsText = Array.isArray(result.equipmentTags) ? result.equipmentTags.join('、') : ''
  result.mealTypesText = Array.isArray(result.mealTypes) ? result.mealTypes.map((value) => MEAL_LABELS[value] || displayText(value)).filter(Boolean).join('、') : ''
  result.foodTagsText = Array.isArray(result.foodTags) ? result.foodTags.join('、') : ''
  const campusLabel = { xueyuan_road: '学院路校区', shahe: '沙河校区' }[result.campus] || ''
  const scopeLabel = { inside: '校内', outside: '校外' }[result.insideOrOutsideCampus] || ''
  const joinDisplay = (...values) => values.filter((value) => value !== null && value !== undefined && String(value).trim() && String(value).toLowerCase() !== 'null').join(' · ')
  result.campusScopeText = joinDisplay(campusLabel, scopeLabel)
  result.locationText = joinDisplay(result.subcategory, result.address)
  result.accessText = joinDisplay(result.distanceText, result.openHours)
  result.reservationPriceText = joinDisplay(`预约：${result.reservationRequired ? '需要' : '不需要'}`, result.priceText)
  result.diningLocationText = joinDisplay(result.diningHall, result.floorOrWindow)
  result.priceDisplayText = joinDisplay(result.priceText)
  result.nutritionDisplayText = joinDisplay(result.nutritionText)
  if (resource.category === 'dining_hall' || resource.cardType === 'merchant') {
    result.diningLocationText = resource.diningLocationText || ''
    result.verificationLabel = '人工整理、信息仅供参考'
  }
  result.displayImage = resourceImage(resource)
  if (Array.isArray(result.foodItems)) result.foodItems = result.foodItems.map((food) => ({ ...food, displayImage: resourceImage(food) }))
  return result
}

function foodCategoryRecords(records, categoryId) {
  const parents = records.filter((record) => record.category === 'dining_hall')
  const parentById = new Map(parents.map((parent) => [parent.diningHallId, parent]))
  const foods = records.filter((record) => record.category !== 'dining_hall').map((food) => ({
    ...food, parentDiningHall: parentById.get(food.diningHallId) || food.parentDiningHall
  }))
  if (categoryId === 'dining_hall') {
    return aggregateDiningHalls(parents.filter((parent) => parent.entityType === 'campus_dining_hall'))
  }
  // 有健康简餐餐品的外部商家才进入该分类，身份依据父实体类型而非名称。
  const merchantIds = new Set(foods.filter((food) => food.category === 'healthy_light_meal' &&
    parentById.has(food.diningHallId) && parentById.get(food.diningHallId).entityType === 'external_merchant').map((food) => food.diningHallId))
  if (categoryId === 'healthy_light_meal') {
    const dishes = foods.filter((food) => food.category === categoryId && !merchantIds.has(food.diningHallId))
    const merchants = [...merchantIds].map((id) => merchantCard(parentById.get(id), foods.filter((food) => food.diningHallId === id)))
    return [...dishes.map((food) => ({ ...food, effectiveOpenHoursText: effectiveFoodHours(food) })), ...merchants]
  }
  const primaryFoodIds = new Set(foods.filter((food) => ['healthy_light_meal', 'high_protein'].includes(food.category)).map((food) => food.resourceId))
  return foods.filter((food) => food.category === categoryId && (categoryId !== 'other_food' ||
    (!merchantIds.has(food.diningHallId) && !primaryFoodIds.has(food.resourceId))))
    .map((food) => ({ ...food, effectiveOpenHoursText: effectiveFoodHours(food) }))
}

async function loadResourceList(type, categoryId, options = {}) {
  const categories = type === 'sport' ? SPORT_CATEGORIES : type === 'food' ? FOOD_CATEGORIES : null
  const fields = type === 'sport' ? SPORT_RESOURCE_FIELDS : type === 'food' ? FOOD_RESOURCE_FIELDS : null
  if (!categories || !categories.some((category) => category.id === categoryId)) {
    return Promise.resolve({ status: COMMUNITY_PAGE_STATUS.ERROR, items: [], errorMessage: '资源分类无效，请返回后重试' })
  }
  const records = Array.isArray(options.records) ? options.records : type === 'food' && categoryId !== 'dining_hall'
    ? (await Promise.all(FOOD_CATEGORIES.map((category) => campusResourceRepository.loadCommunityResources(type, category.id)))).flat()
    : await campusResourceRepository.loadCommunityResources(type, categoryId)
  const viewRecords = type === 'food' ? foodCategoryRecords(records, categoryId) : records.filter((record) => record.category === categoryId)
  const items = viewRecords.map((record) => publicResource(record, fields, options.now || new Date()))
  console.info('[community-resources] filter', { type, category: categoryId, before: records.length, after: items.length, source: Array.isArray(options.records) ? 'test-records' : 'cloud' })
  return Promise.resolve({ status: items.length ? COMMUNITY_PAGE_STATUS.SUCCESS : COMMUNITY_PAGE_STATUS.EMPTY, items, errorMessage: '' })
}

function loadCommunityPosts() {
  const items = COMMUNITY_RESOURCE_SOURCE.posts.slice()
  return Promise.resolve({ status: items.length ? COMMUNITY_PAGE_STATUS.SUCCESS : COMMUNITY_PAGE_STATUS.EMPTY, items, errorMessage: '' })
}

module.exports = {
  COMMUNITY_RESOURCE_SOURCE,
  SPORT_RESOURCE_FIELDS,
  FOOD_RESOURCE_FIELDS,
  isVerifiedAndCurrent,
  loadResourceList,
  loadCommunityPosts
}
