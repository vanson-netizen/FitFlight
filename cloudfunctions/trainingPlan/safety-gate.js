const { RULE_CONFIG } = require('./rule-config')

const SAFETY_FIELDS = ['painOrInjuryStatus', 'postSurgeryOrRehabStatus', 'doctorRestrictionStatus', 'specialPhysicalStatus', 'medicalPurposeStatus', 'eatingConcernStatus']
const SAFETY_VALUES = ['none', 'present', 'unsure', 'prefer_not_to_answer']

function valueOf(field) { return field && typeof field === 'object' && 'value' in field ? field.value : field }
function calculateAge(birthDate, now = new Date()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  let age = now.getUTCFullYear() - year
  if (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)) age -= 1
  return age
}
function denied(stableCode, userMessage, decision = 'requires_professional_guidance') { return { decision, stableCode, userMessage, reviewTags: [stableCode] } }

function evaluateSafetyGate({ profile, profileVersion, portrait, now }) {
  const conditions = portrait && portrait.trainingConditions
  const required = [valueOf(portrait && portrait.trainingGoal), valueOf(portrait && portrait.campus), valueOf(conditions && conditions.availableDaysPerWeek), valueOf(conditions && conditions.sessionDurationMinutes), valueOf(conditions && conditions.experienceLevel), valueOf(conditions && conditions.equipmentAccess), valueOf(conditions && conditions.exercisePreferences)]
  if (!profile || !portrait || portrait.status !== 'complete' || portrait.profileVersion !== profileVersion || required.some((item) => item === null || item === undefined || item === '' || (Array.isArray(item) && !item.length))) return denied('PROFILE_OR_PORTRAIT_INCOMPLETE', '请先完善并更新当前身体档案和用户画像', 'data_conflict')
  const age = calculateAge(profile.birthDate, now)
  if (age === null) return denied('PROFILE_OR_PORTRAIT_INCOMPLETE', '出生日期无效，请先更新身体信息', 'data_conflict')
  if (age < RULE_CONFIG.population.minimumAgeYears) return denied('MINOR_OUT_OF_V1_SCOPE', 'V1 培养方案仅面向成年人')
  if (age > RULE_CONFIG.population.maximumAgeYears) return denied('AGE_GROUP_OUT_OF_V1_SCOPE', '当前年龄范围暂不在 V1 自动方案覆盖范围内')
  const limitation = valueOf(portrait.safetyConditions && portrait.safetyConditions.exerciseLimitationStatus)
  if (limitation === 'unsure') return denied('LIMITATION_REQUIRES_CLARIFICATION', '运动限制状态尚不明确，请先咨询专业人员')
  if (limitation !== 'none') return denied('LIMITATION_REQUIRES_PROFESSIONAL_GUIDANCE', '存在运动限制，请先咨询专业人员')
  const screening = portrait.safetyScreening
  if (!screening || screening.safetyScreeningVersion !== RULE_CONFIG.safetyScreeningVersion || screening.safetyAcknowledged !== true || SAFETY_FIELDS.some((field) => !SAFETY_VALUES.includes(screening[field]))) return denied('SAFETY_SCREENING_INCOMPLETE', '请先完成有效的安全信息筛查', 'data_conflict')
  if (screening.painOrInjuryStatus !== 'none' || screening.postSurgeryOrRehabStatus !== 'none') return denied('PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE', '疼痛、损伤或恢复问题需要先由专业人员评估')
  if (screening.doctorRestrictionStatus !== 'none') return denied('MEDICAL_RESTRICTION_OUT_OF_SCOPE', '请遵从医生要求，当前不自动生成方案')
  if (['specialPhysicalStatus', 'medicalPurposeStatus', 'eatingConcernStatus'].some((field) => screening[field] !== 'none')) return denied('MEDICAL_REQUEST_OUT_OF_SCOPE', '当前情况超出一般健康管理方案范围，请咨询专业人员')
  const goal = valueOf(portrait.trainingGoal)
  const currentWeight = profile.weightKg
  const targetWeight = profile.targetWeightKg
  if (Number.isFinite(targetWeight) && ((goal === 'fat_loss' && targetWeight >= currentWeight) || (goal === 'weight_gain' && targetWeight <= currentWeight))) return denied('GOAL_DIRECTION_CONFLICT', '培养目标与目标体重方向不一致，请先修改资料', 'requires_clarification')
  if (Number.isFinite(targetWeight) && Number.isFinite(profile.heightCm)) {
    const targetBmi = targetWeight / ((profile.heightCm / 100) ** 2)
    if ((goal === 'fat_loss' && targetBmi < 18.5) || (goal === 'weight_gain' && targetBmi >= 28)) return denied('AGGRESSIVE_OR_IMPLAUSIBLE_TARGET', '目标体重超出当前自动方案的保守边界，请咨询专业人员')
  }
  return { decision: 'eligible', stableCode: 'ELIGIBLE', userMessage: '', reviewTags: ['product_draft'] }
}

module.exports = { SAFETY_FIELDS, calculateAge, evaluateSafetyGate }
