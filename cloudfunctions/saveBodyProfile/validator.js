const GENDERS = ['male', 'female', 'other']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const ALLOWED_KEYS = ['gender', 'birthDate', 'heightCm', 'weightKg', 'targetWeightKg', 'activityLevel']
const FORBIDDEN_KEYS = ['openid', 'openId', '_openid']

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return NaN
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false
  const today = new Date()
  const earliest = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()))
  return date <= today && date >= earliest
}

function validate(event) {
  const errors = {}
  if (!isPlainObject(event)) return { errors: { form: '请求参数格式错误' } }

  if (FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(event, key))) {
    errors.form = '请求中不允许包含用户身份字段'
  }
  if (Object.keys(event).some((key) => !ALLOWED_KEYS.includes(key) && !FORBIDDEN_KEYS.includes(key))) {
    errors.form = '请求包含不支持的字段'
  }
  if (!GENDERS.includes(event.gender)) errors.gender = '请选择有效的性别'
  if (!isValidDate(event.birthDate)) errors.birthDate = '请选择有效的出生日期'
  if (!ACTIVITY_LEVELS.includes(event.activityLevel)) errors.activityLevel = '请选择有效的活动水平'

  const heightCm = parseNumber(event.heightCm)
  const weightKg = parseNumber(event.weightKg)
  const hasTargetWeight = event.targetWeightKg !== '' && event.targetWeightKg !== null && event.targetWeightKg !== undefined
  const targetWeightKg = hasTargetWeight ? parseNumber(event.targetWeightKg) : null
  if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250) errors.heightCm = '身高须在 80–250 cm 之间'
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) errors.weightKg = '体重须在 20–400 kg 之间'
  if (hasTargetWeight && (!Number.isFinite(targetWeightKg) || targetWeightKg < 20 || targetWeightKg > 400)) {
    errors.targetWeightKg = '目标体重须在 20–400 kg 之间'
  }

  if (Object.keys(errors).length) return { errors }
  return { value: {
    gender: event.gender,
    birthDate: event.birthDate,
    heightCm: Math.round(heightCm * 10) / 10,
    weightKg: Math.round(weightKg * 10) / 10,
    targetWeightKg: hasTargetWeight ? Math.round(targetWeightKg * 10) / 10 : null,
    activityLevel: event.activityLevel
  } }
}

module.exports = { validate }
