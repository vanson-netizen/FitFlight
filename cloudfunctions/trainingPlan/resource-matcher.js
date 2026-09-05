const fallbackResources = require('./buaa-resources.pending.1.json')

const PREFERENCE_CAPABILITIES = Object.freeze({
  walking: ['walkable_route'],
  running: ['running_track'],
  cycling: ['cycling_route'],
  strength: ['strength_equipment'],
  mobility: ['open_space'],
  group_fitness: ['group_fitness_space']
})

function valueOf(field, fallback = null) {
  return field && typeof field === 'object' && Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : (field === undefined ? fallback : field)
}

function isCurrentlyVerified(record, planDate) {
  return record.status === 'verified' && Boolean(record.verifiedAt) && Boolean(record.validUntil) && record.validUntil >= planDate
}

function requiredCapabilities(portrait) {
  const conditions = portrait && portrait.trainingConditions
  const preferences = valueOf(conditions && conditions.exercisePreferences, [])
  const tags = Array.isArray(preferences) ? preferences.flatMap((preference) => PREFERENCE_CAPABILITIES[preference] || []) : []
  if (valueOf(portrait && portrait.trainingGoal) === 'muscle_gain') tags.push('strength_equipment')
  return [...new Set(tags)]
}

function scoreVenue(venue, campus, capabilities) {
  let score = campus !== 'unknown' && venue.campus === campus ? 100 : 0
  score += capabilities.filter((tag) => venue.capabilityTags.includes(tag)).length * 10
  return score
}

function matchVenue({ campus = 'unknown', portrait, planDate, resources = fallbackResources }) {
  const capabilities = requiredCapabilities(portrait)
  const verified = resources.venues
    .filter((venue) => isCurrentlyVerified(venue, planDate))
    .filter((venue) => campus === 'unknown' || venue.campus === campus)
    .filter((venue) => capabilities.length === 0 || capabilities.some((tag) => venue.capabilityTags.includes(tag)))
    .sort((left, right) => scoreVenue(right, campus, capabilities) - scoreVenue(left, campus, capabilities))
  const pendingCount = resources.venues.filter((venue) => venue.status === 'pending_verification' && (campus === 'unknown' || venue.campus === campus)).length
  if (!verified.length) return { status: 'no_match', locationText: '暂无已核实地点', locationStatusText: '无已核实地点', dataPendingVerification: pendingCount > 0, candidates: [] }
  const venue = verified[0]
  return {
    status: 'matched',
    locationText: venue.name,
    locationStatusText: '人工整理',
    dataPendingVerification: false,
    candidates: [{ venueId: venue.venueId, name: venue.name, campus: venue.campus, locationText: venue.locationText, capabilityTags: [...venue.capabilityTags], status: venue.status, verifiedAt: venue.verifiedAt, validUntil: venue.validUntil }]
  }
}

function foodTags(food) {
  return [...food.foodGroupTags.staples, ...food.foodGroupTags.vegetables, ...food.foodGroupTags.proteins]
}

function matchFood({ campus = 'unknown', mealPeriod, requiredFoodGroupTags = [], planDate, resources = fallbackResources }) {
  const verified = resources.foodOptions.filter((food) => {
    return isCurrentlyVerified(food, planDate) && (campus === 'unknown' || food.campus === campus) && food.mealPeriods.includes(mealPeriod)
  }).sort((left, right) => {
    const score = (food) => requiredFoodGroupTags.filter((tag) => foodTags(food).includes(tag)).length
    return score(right) - score(left)
  })
  const pendingCount = resources.foodOptions.filter((food) => food.status === 'pending_verification' && (campus === 'unknown' || food.campus === campus) && food.mealPeriods.includes(mealPeriod)).length
  if (!verified.length) return { status: 'no_match', dataPendingVerification: pendingCount > 0, candidates: [] }
  const food = verified[0]
  const hall = resources.diningHalls.find((item) => item.diningHallId === food.diningHallId && isCurrentlyVerified(item, planDate))
  if (!hall) return { status: 'no_match', dataPendingVerification: pendingCount > 0, candidates: [] }
  return {
    status: 'matched',
    dataPendingVerification: false,
    candidates: [{ foodOptionId: food.foodOptionId, dishName: food.dishName, mealPeriods: [...food.mealPeriods], foodGroupTags: food.foodGroupTags, estimatedKcal: food.nutrition.estimatedKcal, diningHall: { diningHallId: hall.diningHallId, name: hall.name, floor: hall.floor }, status: food.status, verifiedAt: food.verifiedAt, validUntil: food.validUntil }]
  }
}

module.exports = { RESOURCE_DATA_VERSION: fallbackResources.resourceDataVersion, matchVenue, matchFood, requiredCapabilities }
