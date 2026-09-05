const { getPortrait, savePortrait } = require('../../services/user-portrait-service')
const trainingPlanService = require('../../services/training-plan-service')
const {
  PORTRAIT_ERROR_CODES,
  TRAINING_GOAL_OPTIONS,
  CAMPUS_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  SESSION_DURATION_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  EXERCISE_PREFERENCE_OPTIONS,
  EXERCISE_LIMITATION_OPTIONS
} = require('../../constants/user-portrait')

function valueOf(field, fallback = '') {
  return field && Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : fallback
}

function optionIndex(options, value) {
  return options.findIndex((option) => option.value === value)
}

Page({
  data: {
    loadStatus: 'loading',
    errorMessage: '',
    fieldErrors: {},
    portraitVersion: 0,
    isSubmitting: false,
    trainingGoalOptions: TRAINING_GOAL_OPTIONS,
    campusOptions: CAMPUS_OPTIONS,
    availableDaysOptions: AVAILABLE_DAYS_OPTIONS,
    sessionDurationOptions: SESSION_DURATION_OPTIONS,
    experienceLevelOptions: EXPERIENCE_LEVEL_OPTIONS,
    equipmentAccessOptions: EQUIPMENT_ACCESS_OPTIONS,
    exercisePreferenceOptions: EXERCISE_PREFERENCE_OPTIONS.map((option) => ({ ...option, checked: false })),
    exerciseLimitationOptions: EXERCISE_LIMITATION_OPTIONS,
    indices: { campus: -1, trainingGoal: -1, availableDays: -1, sessionDuration: -1, experienceLevel: -1, equipmentAccess: -1, exerciseLimitation: -1 },
    form: {
      campus: '',
      trainingGoal: '',
      availableDaysPerWeek: null,
      sessionDurationMinutes: null,
      experienceLevel: '',
      equipmentAccess: '',
      exercisePreferences: [],
      exerciseLimitationStatus: ''
    }
  },

  onLoad() {
    this.loadPortrait()
  },

  async loadPortrait() {
    this.setData({ loadStatus: 'loading', errorMessage: '', fieldErrors: {} })
    try {
      const result = await getPortrait()
      if (result.portraitStatus === 'incomplete') {
        this.setData({ loadStatus: 'incomplete' })
        return
      }
      const portrait = result.portrait
      const form = portrait ? {
        campus: valueOf(portrait.campus, 'unknown'),
        trainingGoal: valueOf(portrait.trainingGoal),
        availableDaysPerWeek: valueOf(portrait.trainingConditions.availableDaysPerWeek, null),
        sessionDurationMinutes: valueOf(portrait.trainingConditions.sessionDurationMinutes, null),
        experienceLevel: valueOf(portrait.trainingConditions.experienceLevel),
        equipmentAccess: valueOf(portrait.trainingConditions.equipmentAccess),
        exercisePreferences: valueOf(portrait.trainingConditions.exercisePreferences, []),
        exerciseLimitationStatus: valueOf(portrait.safetyConditions.exerciseLimitationStatus)
      } : this.data.form
      this.setData({
        loadStatus: 'ready',
        portraitVersion: portrait ? portrait.portraitVersion : 0,
        form,
        exercisePreferenceOptions: EXERCISE_PREFERENCE_OPTIONS.map((option) => ({ ...option, checked: form.exercisePreferences.includes(option.value) })),
        indices: {
          campus: optionIndex(CAMPUS_OPTIONS, form.campus),
          trainingGoal: optionIndex(TRAINING_GOAL_OPTIONS, form.trainingGoal),
          availableDays: optionIndex(AVAILABLE_DAYS_OPTIONS, form.availableDaysPerWeek),
          sessionDuration: optionIndex(SESSION_DURATION_OPTIONS, form.sessionDurationMinutes),
          experienceLevel: optionIndex(EXPERIENCE_LEVEL_OPTIONS, form.experienceLevel),
          equipmentAccess: optionIndex(EQUIPMENT_ACCESS_OPTIONS, form.equipmentAccess),
          exerciseLimitation: optionIndex(EXERCISE_LIMITATION_OPTIONS, form.exerciseLimitationStatus)
        }
      })
    } catch (error) {
      this.setData({ loadStatus: 'error', errorMessage: error.message || '暂时无法读取画像' })
    }
  },

  changeSingleOption(event) {
    const field = event.currentTarget.dataset.field
    const optionSet = event.currentTarget.dataset.options
    const indexKey = event.currentTarget.dataset.index
    const index = Number(event.detail.value)
    const options = this.data[optionSet]
    this.setData({ [`form.${field}`]: options[index].value, [`indices.${indexKey}`]: index, [`fieldErrors.${field}`]: '', errorMessage: '' })
  },

  changePreferences(event) {
    let values = event.detail.value
    const previous = this.data.form.exercisePreferences
    if (values.includes('unsure') && !previous.includes('unsure')) values = ['unsure']
    else if (values.includes('unsure') && values.length > 1) values = values.filter((value) => value !== 'unsure')
    this.setData({
      'form.exercisePreferences': values,
      exercisePreferenceOptions: EXERCISE_PREFERENCE_OPTIONS.map((option) => ({ ...option, checked: values.includes(option.value) })),
      'fieldErrors.exercisePreferences': '',
      errorMessage: ''
    })
  },

  validateForm() {
    const form = this.data.form
    const errors = {}
    if (!form.campus) errors.campus = '请选择所在校区'
    if (!form.trainingGoal) errors.trainingGoal = '请选择训练目标'
    if (!form.availableDaysPerWeek) errors.availableDaysPerWeek = '请选择每周训练天数'
    if (!form.sessionDurationMinutes) errors.sessionDurationMinutes = '请选择单次训练时间'
    if (!form.experienceLevel) errors.experienceLevel = '请选择训练经验'
    if (!form.equipmentAccess) errors.equipmentAccess = '请选择器械条件'
    if (!form.exercisePreferences.length) errors.exercisePreferences = '请选择运动偏好或不确定'
    if (!form.exerciseLimitationStatus) errors.exerciseLimitationStatus = '请选择运动限制情况'
    this.setData({ fieldErrors: errors })
    return Object.keys(errors).length === 0
  },

  async submit() {
    if (this.data.isSubmitting || this.data.loadStatus !== 'ready' || !this.validateForm()) return
    this.setData({ isSubmitting: true, errorMessage: '' })
    try {
      const result = await savePortrait(this.data.form, this.data.portraitVersion)
      this.setData({ portraitVersion: result.portrait.portraitVersion })
      if (result.shouldAskPlanAdjustment) await this.askPlanAdjustment(result)
      else await this.finish()
    } catch (error) {
      if (error.code === PORTRAIT_ERROR_CODES.INVALID_PARAM) {
        this.setData({ fieldErrors: error.fieldErrors || {}, errorMessage: error.message || '请检查画像信息' })
      } else if (error.code === PORTRAIT_ERROR_CODES.PORTRAIT_VERSION_CONFLICT) {
        wx.showModal({ title: '画像已更新', content: '画像已在其他页面更新，请加载最新画像后再修改。', showCancel: false, success: () => this.loadPortrait() })
      } else {
        this.setData({ errorMessage: error.message || '画像生成失败，请稍后重试' })
      }
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  askPlanAdjustment(result) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '画像发生较大变化',
        content: '是否将现有方案标记为待调整？本次不会生成或覆盖方案内容。',
        confirmText: '调整方案',
        cancelText: '暂不调整',
        success: async ({ confirm }) => {
          if (!confirm) { await this.deferPlanAdjustment(result); resolve(); return }
          await this.requestPlanAdjustment(result)
          resolve()
        },
        fail: async () => { await this.deferPlanAdjustment(result); resolve() }
      })
    })
  },

  async deferPlanAdjustment(result) {
    try {
      await trainingPlanService.deferGeneration(result.profileVersion, 'adjustment')
      await this.finish()
    } catch (error) {
      this.setData({ errorMessage: error.message || '方案状态更新失败，请稍后重试' })
    }
  },

  async requestPlanAdjustment(result) {
    const requestId = this.adjustmentRequestId || trainingPlanService.createRequestId()
    this.adjustmentRequestId = requestId
    try {
      await trainingPlanService.setPortraitAdjustmentPending()
      await trainingPlanService.requestGeneration('adjustment', requestId, { profileVersion: result.profileVersion, portraitVersion: result.portrait.portraitVersion })
      this.adjustmentRequestId = ''
      await this.finish()
    } catch (error) {
      await new Promise((resolve) => {
        wx.showModal({
          title: '方案状态尚未更新',
          content: '画像已经保存。你可以重试标记待调整，或暂时保留旧方案。',
          confirmText: '重试',
          cancelText: '暂不调整',
          success: async ({ confirm }) => {
            if (confirm) await this.requestPlanAdjustment(result)
            else await this.finish()
            resolve()
          },
          fail: async () => { await this.finish(); resolve() }
        })
      })
    }
  },

  finish() {
    return new Promise((resolve) => {
      wx.showToast({ title: '画像已生成', icon: 'success' })
      setTimeout(() => wx.redirectTo({ url: '/pages/my-portrait/my-portrait', complete: resolve }), 500)
    })
  },

  openBodyProfile() {
    wx.navigateTo({ url: '/pages/body-profile/body-profile' })
  }
})
