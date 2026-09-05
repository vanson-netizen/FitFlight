const CAMPUS = Object.freeze({ '学院路': 'xueyuan_road', '学院路校区': 'xueyuan_road', '沙河': 'shahe', '沙河校区': 'shahe' })
const RESOURCE_STATUS = Object.freeze({ PENDING: 'pending_verification', VERIFIED: 'verified', EXPIRED: 'expired' })
const COLLECTIONS = Object.freeze({ venues: 'campus_venues', diningHalls: 'campus_dining_halls', foodOptions: 'campus_food_options' })

module.exports = { CAMPUS, RESOURCE_STATUS, COLLECTIONS }
