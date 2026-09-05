const {
  TRAINING_GOALS,
  CAMPUSES,
  SESSION_DURATIONS,
  EXPERIENCE_LEVELS,
  EQUIPMENT_ACCESS,
  EXERCISE_PREFERENCES,
  EXERCISE_LIMITATION_STATUSES,
  IDENTITY_FIELDS,
  SYSTEM_METADATA_FIELDS
} = require('./portrait-config')
const { USER_PORTRAIT_ACTIONS } = require('./actions')

const ACTION_FIELDS = {
  [USER_PORTRAIT_ACTIONS.GET]: ['action'],
  [USER_PORTRAIT_ACTIONS.SAVE]: ['action', 'portrait', 'expectedPortraitVersion'],
  [USER_PORTRAIT_ACTIONS.SAVE_SAFETY_SCREENING]: ['action', 'safetyScreening', 'expectedPortraitVersion']
}
const PORTRAIT_FIELDS = ['campus', 'trainingGoal', 'trainingConditions', 'safetyConditions']
const TRAINING_CONDITION_FIELDS = [
  'availableDaysPerWeek',
  'sessionDurationMinutes',
  'experienceLevel',
  'equipmentAccess',
  'exercisePreferences'
]
const SAFETY_CONDITION_FIELDS = ['exerciseLimitationStatus']

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((field) => allowed.includes(field))
}

function validateRequest(event) {
  if (!isPlainObject(event)) return { ok: false, code: 'INVALID_PARAM', message: '请求参数格式错误' }
  const identityFields = IDENTITY_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(event, field))
  if (identityFields.length) return { ok: false, code: 'INVALID_PARAM', message: '请求中不允许包含用户身份字段', unknownFields: identityFields }
  const allowedFields = ACTION_FIELDS[event.action]
  const businessFields = Object.keys(event).filter((field) => !SYSTEM_METADATA_FIELDS.includes(field))
  if (!allowedFields) return { ok: false, code: 'UNSUPPORTED_ACTION', message: '不支持的操作', unknownFields: businessFields.filter((field) => field !== 'action') }
  const unknownFields = businessFields.filter((field) => !allowedFields.includes(field))
  if (unknownFields.length) return { ok: false, code: 'INVALID_PARAM', message: '请求包含不支持的字段', unknownFields }
  return { ok: true }
}

function validatePortraitInput(input) {
  const errors = {}
  if (!isPlainObject(input) || !hasOnlyKeys(input, PORTRAIT_FIELDS)) return { errors: { form: '画像参数格式错误' } }
  const conditions = input.trainingConditions
  const safety = input.safetyConditions
  if (!TRAINING_GOALS.includes(input.trainingGoal)) errors.trainingGoal = '请选择训练目标'
  if (!CAMPUSES.includes(input.campus)) errors.campus = '请选择所在校区'
  if (!isPlainObject(conditions) || !hasOnlyKeys(conditions, TRAINING_CONDITION_FIELDS)) {
    errors.trainingConditions = '训练条件格式错误'
  } else {
    if (!Number.isInteger(conditions.availableDaysPerWeek) || conditions.availableDaysPerWeek < 1 || conditions.availableDaysPerWeek > 7) {
      errors.availableDaysPerWeek = '每周训练天数须为 1–7 天'
    }
    if (!SESSION_DURATIONS.includes(conditions.sessionDurationMinutes)) errors.sessionDurationMinutes = '请选择单次训练时间'
    if (!EXPERIENCE_LEVELS.includes(conditions.experienceLevel)) errors.experienceLevel = '请选择训练经验'
    if (!EQUIPMENT_ACCESS.includes(conditions.equipmentAccess)) errors.equipmentAccess = '请选择器械条件'
    const preferences = conditions.exercisePreferences
    const validPreferences = Array.isArray(preferences) && preferences.length > 0 && new Set(preferences).size === preferences.length && preferences.every((value) => EXERCISE_PREFERENCES.includes(value))
    if (!validPreferences || (preferences.includes('unsure') && preferences.length > 1)) errors.exercisePreferences = '请选择有效的运动偏好'
  }
  if (!isPlainObject(safety) || !hasOnlyKeys(safety, SAFETY_CONDITION_FIELDS)) {
    errors.safetyConditions = '安全条件格式错误'
  } else if (!EXERCISE_LIMITATION_STATUSES.includes(safety.exerciseLimitationStatus)) {
    errors.exerciseLimitationStatus = '请选择运动限制情况'
  }
  if (Object.keys(errors).length) return { errors }
  return {
    value: {
      campus: input.campus,
      trainingGoal: input.trainingGoal,
      trainingConditions: {
        availableDaysPerWeek: conditions.availableDaysPerWeek,
        sessionDurationMinutes: conditions.sessionDurationMinutes,
        experienceLevel: conditions.experienceLevel,
        equipmentAccess: conditions.equipmentAccess,
        exercisePreferences: [...conditions.exercisePreferences]
      },
      safetyConditions: { exerciseLimitationStatus: safety.exerciseLimitationStatus }
    }
  }
}

module.exports = { ACTION_FIELDS, validateRequest, validatePortraitInput }
