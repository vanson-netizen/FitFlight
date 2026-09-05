const PORTRAIT_STATUS = Object.freeze({
  LOADING: 'loading',
  INCOMPLETE: 'incomplete',
  SKIPPED: 'skipped',
  NOT_GENERATED: 'not_generated',
  GENERATING: 'generating',
  COMPLETE: 'complete',
  NEEDS_REGENERATION: 'needs_regeneration',
  ERROR: 'error'
})

const PORTRAIT_ERROR_CODES = Object.freeze({
  UNSUPPORTED_ACTION: 'UNSUPPORTED_ACTION',
  INVALID_PARAM: 'INVALID_PARAM',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  PORTRAIT_INCOMPLETE: 'PORTRAIT_INCOMPLETE',
  PROFILE_DATA_CONFLICT: 'PROFILE_DATA_CONFLICT',
  PORTRAIT_DATA_CONFLICT: 'PORTRAIT_DATA_CONFLICT',
  PORTRAIT_VERSION_CONFLICT: 'PORTRAIT_VERSION_CONFLICT',
  SAFETY_SCREENING_INCOMPLETE: 'SAFETY_SCREENING_INCOMPLETE',
  PLAN_STATE_CONFLICT: 'PLAN_STATE_CONFLICT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
})

const TRAINING_GOAL_OPTIONS = [
  { value: 'fat_loss', label: '减脂' },
  { value: 'muscle_gain', label: '增肌' },
  { value: 'weight_gain', label: '增重' },
  { value: 'maintain', label: '保持状态' },
  { value: 'fitness_improvement', label: '提升体能' }
]
const TRAINING_GOAL_LABELS = Object.freeze(TRAINING_GOAL_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label
  return labels
}, {}))
const CAMPUS_OPTIONS = [
  { value: 'xueyuan_road', label: '学院路校区' },
  { value: 'shahe', label: '沙河校区' },
  { value: 'unknown', label: '未知/待确认' }
]
const AVAILABLE_DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: `每周 ${value} 天` }))
const SESSION_DURATION_OPTIONS = [20, 30, 45, 60].map((value) => ({ value, label: `${value} 分钟` }))
const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'none', label: '暂无经验' },
  { value: 'beginner', label: '初学者' },
  { value: 'experienced', label: '有稳定训练经验' }
]
const EQUIPMENT_ACCESS_OPTIONS = [
  { value: 'bodyweight', label: '徒手训练' },
  { value: 'basic_equipment', label: '基础器械' },
  { value: 'gym', label: '健身房' }
]
const EXERCISE_PREFERENCE_OPTIONS = [
  { value: 'walking', label: '步行' },
  { value: 'running', label: '跑步' },
  { value: 'cycling', label: '骑行' },
  { value: 'strength', label: '力量训练' },
  { value: 'mobility', label: '拉伸与灵活性' },
  { value: 'group_fitness', label: '团体课程' },
  { value: 'unsure', label: '不确定/暂无偏好' }
]
const EXERCISE_LIMITATION_OPTIONS = [
  { value: 'none', label: '无明确运动限制' },
  { value: 'unsure', label: '不确定' },
  { value: 'has_limitation', label: '存在运动限制' }
]

function optionLabel(options, value, fallback = '暂未设置') {
  const option = options.find((item) => item.value === value)
  return option ? option.label : fallback
}

module.exports = {
  PORTRAIT_STATUS,
  PORTRAIT_ERROR_CODES,
  TRAINING_GOAL_OPTIONS,
  TRAINING_GOAL_LABELS,
  CAMPUS_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  SESSION_DURATION_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  EXERCISE_PREFERENCE_OPTIONS,
  EXERCISE_LIMITATION_OPTIONS,
  optionLabel
}
