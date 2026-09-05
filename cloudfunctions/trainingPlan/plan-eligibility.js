const SAFETY_SCREENING_VERSION = 'safety-screening-v1'
const SAFETY_STATUS_FIELDS = [
  'painOrInjuryStatus',
  'postSurgeryOrRehabStatus',
  'doctorRestrictionStatus',
  'specialPhysicalStatus',
  'medicalPurposeStatus',
  'eatingConcernStatus'
]
const SAFETY_STATUS_VALUES = ['none', 'present', 'unsure', 'prefer_not_to_answer']

function calculateAge(birthDate, now = new Date()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  let age = now.getUTCFullYear() - year
  const currentMonth = now.getUTCMonth() + 1
  if (currentMonth < month || (currentMonth === month && now.getUTCDate() < day)) age -= 1
  return age
}

function evaluatePlanEligibility(profile, portrait) {
  const age = calculateAge(profile && profile.birthDate)
  if (age === null) return 'incomplete'
  if (age < 18) return 'age_not_supported'
  const screening = portrait && portrait.safetyScreening
  if (!screening || screening.safetyScreeningVersion !== SAFETY_SCREENING_VERSION || screening.safetyAcknowledged !== true) return 'incomplete'
  if (SAFETY_STATUS_FIELDS.some((field) => !SAFETY_STATUS_VALUES.includes(screening[field]))) return 'incomplete'
  const limitation = portrait && portrait.safetyConditions && portrait.safetyConditions.exerciseLimitationStatus
  const limitationValue = limitation && typeof limitation === 'object' ? limitation.value : limitation
  if (limitationValue !== 'none' || SAFETY_STATUS_FIELDS.some((field) => screening[field] !== 'none')) return 'needs_professional_review'
  return 'eligible'
}

module.exports = { evaluatePlanEligibility }
