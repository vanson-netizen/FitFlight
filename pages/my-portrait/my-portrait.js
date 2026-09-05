const { getPortrait } = require('../../services/user-portrait-service')
const {
  PORTRAIT_STATUS, TRAINING_GOAL_OPTIONS, CAMPUS_OPTIONS, AVAILABLE_DAYS_OPTIONS, SESSION_DURATION_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS, EQUIPMENT_ACCESS_OPTIONS, EXERCISE_PREFERENCE_OPTIONS,
  EXERCISE_LIMITATION_OPTIONS, optionLabel
} = require('../../constants/user-portrait')

const GENDER_LABELS = { male: '男', female: '女', other: '其他' }
const ACTIVITY_LABELS = {
  sedentary: '久坐（几乎不运动）', light: '轻度（每周 1–2 次）', moderate: '中度（每周 3–4 次）',
  active: '活跃（每周 5–6 次）', very_active: '非常活跃（几乎每天）'
}

function valueOf(field, fallback = null) {
  return field && Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : fallback
}

function formatBodyProfile(profile) {
  if (!profile) return null
  return {
    gender: GENDER_LABELS[profile.gender] || '暂未设置', birthDate: profile.birthDate || '暂未设置',
    height: profile.heightCm === null ? '暂未设置' : `${profile.heightCm} cm`,
    weight: profile.weightKg === null ? '暂未设置' : `${profile.weightKg} kg`,
    targetWeight: profile.targetWeightKg === null ? '暂未设置' : `${profile.targetWeightKg} kg`,
    activityLevel: ACTIVITY_LABELS[profile.activityLevel] || '暂未设置'
  }
}

function formatPortrait(portrait) {
  if (!portrait) return null
  const conditions = portrait.trainingConditions
  const limitation = valueOf(portrait.safetyConditions.exerciseLimitationStatus)
  const preferenceValues = valueOf(conditions.exercisePreferences, [])
  const weightDifference = valueOf(portrait.calculatedMetrics.weightDifferenceKg)
  return {
    portraitVersion: portrait.portraitVersion,
    bmi: valueOf(portrait.calculatedMetrics.bmi),
    weightDifference: weightDifference === null ? '未设置目标体重' : `${weightDifference} kg`,
    campus: optionLabel(CAMPUS_OPTIONS, valueOf(portrait.campus, 'unknown')),
    trainingGoal: optionLabel(TRAINING_GOAL_OPTIONS, valueOf(portrait.trainingGoal)),
    availableDays: optionLabel(AVAILABLE_DAYS_OPTIONS, valueOf(conditions.availableDaysPerWeek)),
    sessionDuration: optionLabel(SESSION_DURATION_OPTIONS, valueOf(conditions.sessionDurationMinutes)),
    experienceLevel: optionLabel(EXPERIENCE_LEVEL_OPTIONS, valueOf(conditions.experienceLevel)),
    equipmentAccess: optionLabel(EQUIPMENT_ACCESS_OPTIONS, valueOf(conditions.equipmentAccess)),
    exercisePreferences: preferenceValues.map((value) => optionLabel(EXERCISE_PREFERENCE_OPTIONS, value)).join('、'),
    exerciseLimitation: optionLabel(EXERCISE_LIMITATION_OPTIONS, limitation),
    showSafetyHint: limitation === 'unsure' || limitation === 'has_limitation'
  }
}

Page({
  data: { profileStatus: PORTRAIT_STATUS.LOADING, bodyProfile: null, portrait: null, errorMessage: '' },
  onShow() { this.loadPortrait() },

  async loadPortrait() {
    const requestId = (this.requestId || 0) + 1
    this.requestId = requestId
    this.setData({ profileStatus: PORTRAIT_STATUS.LOADING, bodyProfile: null, portrait: null, errorMessage: '' })
    try {
      const result = await getPortrait()
      if (requestId !== this.requestId) return
      let status = result.portraitStatus
      if (status === PORTRAIT_STATUS.NOT_GENERATED) {
        const app = getApp()
        if (app.globalData && app.globalData.portraitOnboardingDismissed) status = PORTRAIT_STATUS.SKIPPED
      }
      this.setData({ profileStatus: status, bodyProfile: formatBodyProfile(result.bodyProfile), portrait: formatPortrait(result.portrait) })
    } catch (error) {
      if (requestId !== this.requestId) return
      this.setData({ profileStatus: PORTRAIT_STATUS.ERROR, errorMessage: error.message || '暂时无法读取画像，请稍后重试' })
    }
  },

  retryLoad() { this.loadPortrait() },
  openBodyProfile() { wx.navigateTo({ url: '/pages/body-profile/body-profile', fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' }) }) },
  openPortraitEditor() { wx.navigateTo({ url: '/pages/portrait-editor/portrait-editor', fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' }) }) },
  openSafetyScreening() { wx.navigateTo({ url: '/pages/safety-screening/safety-screening', fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' }) }) }
})
