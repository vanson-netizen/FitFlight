const COMMUNITY_PAGE_STATUS = Object.freeze({
  LOADING: 'loading',
  EMPTY: 'empty',
  ERROR: 'error',
  SUCCESS: 'success'
})

const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending_verification',
  VERIFIED: 'verified',
  EXPIRED: 'expired'
})

const SPORT_CATEGORIES = Object.freeze([
  { id: 'gym', label: '健身房' },
  { id: 'ball_sports', label: '球类运动' },
  { id: 'swimming', label: '游泳' },
  { id: 'track_and_other', label: '操场及其他场地' }
])

const FOOD_CATEGORIES = Object.freeze([
  { id: 'dining_hall', label: '食堂' },
  { id: 'healthy_light_meal', label: '健康简餐' },
  { id: 'high_protein', label: '高蛋白选择' },
  { id: 'other_food', label: '其他餐饮' }
])

module.exports = { COMMUNITY_PAGE_STATUS, VERIFICATION_STATUS, SPORT_CATEGORIES, FOOD_CATEGORIES }
