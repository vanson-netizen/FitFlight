const SAFETY_SCREENING_VERSION = 'safety-screening-v1'
const SAFETY_STATUS_VALUES = ['none', 'present', 'unsure', 'prefer_not_to_answer']
const SAFETY_STATUS_FIELDS = [
  'painOrInjuryStatus',
  'postSurgeryOrRehabStatus',
  'doctorRestrictionStatus',
  'specialPhysicalStatus',
  'medicalPurposeStatus',
  'eatingConcernStatus'
]
const PLAN_ELIGIBILITY_STATUS = Object.freeze({
  ELIGIBLE: 'eligible',
  NEEDS_PROFESSIONAL_REVIEW: 'needs_professional_review',
  INCOMPLETE: 'incomplete',
  AGE_NOT_SUPPORTED: 'age_not_supported'
})

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function calculateAge(birthDate, now = new Date()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const parts = birthDate.split('-').map(Number)
  if (parts.some((value) => !Number.isInteger(value))) return null
  let age = now.getUTCFullYear() - parts[0]
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  if (month < parts[1] || (month === parts[1] && day < parts[2])) age -= 1
  return age
}

function validateSafetyScreeningInput(input) {
  const errors = {}
  const allowed = [...SAFETY_STATUS_FIELDS, 'safetyAcknowledged']
  if (!isPlainObject(input) || Object.keys(input).some((field) => !allowed.includes(field))) {
    return { errors: { form: '安全筛查参数格式错误' } }
  }
  SAFETY_STATUS_FIELDS.forEach((field) => {
    if (!SAFETY_STATUS_VALUES.includes(input[field])) errors[field] = '请选择一个选项'
  })
  if (input.safetyAcknowledged !== true) errors.safetyAcknowledged = '请确认安全说明'
  if (Object.keys(errors).length) return { code: 'SAFETY_SCREENING_INCOMPLETE', errors }
  return { value: Object.fromEntries(allowed.map((field) => [field, input[field]])) }
}

function evaluatePlanEligibility(profile, portrait, screening) {
  screening = screening || (portrait && portrait.safetyScreening)
  const age = calculateAge(profile && profile.birthDate)
  if (age === null) return PLAN_ELIGIBILITY_STATUS.INCOMPLETE
  if (age < 18) return PLAN_ELIGIBILITY_STATUS.AGE_NOT_SUPPORTED
  if (!isPlainObject(screening) || screening.safetyScreeningVersion !== SAFETY_SCREENING_VERSION) return PLAN_ELIGIBILITY_STATUS.INCOMPLETE
  if (screening.safetyAcknowledged !== true || SAFETY_STATUS_FIELDS.some((field) => !SAFETY_STATUS_VALUES.includes(screening[field]))) {
    return PLAN_ELIGIBILITY_STATUS.INCOMPLETE
  }
  const limitation = portrait && portrait.safetyConditions && portrait.safetyConditions.exerciseLimitationStatus
  const limitationValue = limitation && typeof limitation === 'object' ? limitation.value : limitation
  if (limitationValue !== 'none') return PLAN_ELIGIBILITY_STATUS.NEEDS_PROFESSIONAL_REVIEW
  if (SAFETY_STATUS_FIELDS.some((field) => screening[field] !== 'none')) return PLAN_ELIGIBILITY_STATUS.NEEDS_PROFESSIONAL_REVIEW
  return PLAN_ELIGIBILITY_STATUS.ELIGIBLE
}

module.exports = {
  SAFETY_SCREENING_VERSION,
  SAFETY_STATUS_VALUES,
  SAFETY_STATUS_FIELDS,
  PLAN_ELIGIBILITY_STATUS,
  calculateAge,
  validateSafetyScreeningInput,
  evaluatePlanEligibility
}
