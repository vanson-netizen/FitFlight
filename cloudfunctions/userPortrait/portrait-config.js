const PORTRAIT_RULE_VERSION = 'portrait-v1'
const CHANGE_POLICY_VERSION = 'portrait-change-v1'

const TRAINING_GOALS = ['fat_loss', 'muscle_gain', 'weight_gain', 'maintain', 'fitness_improvement']
const CAMPUSES = ['xueyuan_road', 'shahe', 'unknown']
const SESSION_DURATIONS = [20, 30, 45, 60]
const EXPERIENCE_LEVELS = ['none', 'beginner', 'experienced']
const EQUIPMENT_ACCESS = ['bodyweight', 'basic_equipment', 'gym']
const EXERCISE_PREFERENCES = ['walking', 'running', 'cycling', 'strength', 'mobility', 'group_fitness', 'unsure']
const EXERCISE_LIMITATION_STATUSES = ['none', 'unsure', 'has_limitation']
const IDENTITY_FIELDS = ['openid', 'openId', '_openid', 'ownerOpenId', 'userId']
const SYSTEM_METADATA_FIELDS = ['tcbContext', 'userInfo']

const CHANGE_THRESHOLDS = Object.freeze({
  weightAbsoluteKg: 5,
  targetWeightAbsoluteKg: 3
})

module.exports = {
  PORTRAIT_RULE_VERSION,
  CHANGE_POLICY_VERSION,
  TRAINING_GOALS,
  CAMPUSES,
  SESSION_DURATIONS,
  EXPERIENCE_LEVELS,
  EQUIPMENT_ACCESS,
  EXERCISE_PREFERENCES,
  EXERCISE_LIMITATION_STATUSES,
  IDENTITY_FIELDS,
  SYSTEM_METADATA_FIELDS,
  CHANGE_THRESHOLDS
}
