const SAFETY_SCREENING_VERSION = 'safety-screening-v1'

const SAFETY_STATUS_OPTIONS = Object.freeze([
  { value: 'none', label: '无' },
  { value: 'present', label: '存在' },
  { value: 'unsure', label: '不确定' },
  { value: 'prefer_not_to_answer', label: '暂不回答' }
])

const SAFETY_QUESTIONS = Object.freeze([
  { field: 'painOrInjuryStatus', label: '当前是否存在运动可能加重的疼痛或损伤？' },
  { field: 'postSurgeryOrRehabStatus', label: '目前是否处于术后或康复阶段？' },
  { field: 'doctorRestrictionStatus', label: '医生是否要求你限制或避免运动？' },
  { field: 'specialPhysicalStatus', label: '是否存在不适合普通运动建议的特殊身体状态？' },
  { field: 'medicalPurposeStatus', label: '是否以治疗、康复或其他医疗目的寻求方案？' },
  { field: 'eatingConcernStatus', label: '是否存在需要医生或注册营养师指导的饮食问题？' }
])

const PLAN_ELIGIBILITY_STATUS = Object.freeze({
  ELIGIBLE: 'eligible',
  NEEDS_PROFESSIONAL_REVIEW: 'needs_professional_review',
  INCOMPLETE: 'incomplete',
  AGE_NOT_SUPPORTED: 'age_not_supported'
})

module.exports = { SAFETY_SCREENING_VERSION, SAFETY_STATUS_OPTIONS, SAFETY_QUESTIONS, PLAN_ELIGIBILITY_STATUS }
