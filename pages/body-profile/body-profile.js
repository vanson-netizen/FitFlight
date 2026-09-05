const { ERROR_CODES, getBodyProfile, saveBodyProfile } = require('../../services/user-profile-service')

const GENDER_OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' }
]
const ACTIVITY_OPTIONS = [
  { label: '久坐（几乎不运动）', value: 'sedentary' },
  { label: '轻度（每周 1–2 次）', value: 'light' },
  { label: '中度（每周 3–4 次）', value: 'moderate' },
  { label: '活跃（每周 5–6 次）', value: 'active' },
  { label: '非常活跃（几乎每天）', value: 'very_active' }
]

Page({
  data: {
    genderOptions: GENDER_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    genderIndex: -1,
    activityIndex: -1,
    today: new Date().toISOString().slice(0, 10),
    form: {
      gender: '',
      birthDate: '',
      heightCm: '',
      weightKg: '',
      targetWeightKg: '',
      activityLevel: ''
    },
    fieldErrors: {},
    errorMessage: '',
    loadStatus: 'loading',
    profileVersion: 0,
    hasExistingProfile: false,
    isSubmitting: false,
    showPortraitOnboarding: false,
    isOpeningPortraitEditor: false
  },

  onLoad(options = {}) {
    const prefillWeightKg = Number(options.prefillWeightKg)
    this.pendingWeightPrefill = Number.isFinite(prefillWeightKg) && prefillWeightKg >= 20 && prefillWeightKg <= 400 ? String(prefillWeightKg) : ''
    this.loadBodyProfile()
  },

  async loadBodyProfile() {
    if (this.data.isSubmitting) return
    this.setData({ loadStatus: 'loading', errorMessage: '', fieldErrors: {} })

    try {
      const result = await getBodyProfile()
      const profile = result.profile || {
        gender: '',
        birthDate: '',
        heightCm: '',
        weightKg: '',
        targetWeightKg: '',
        activityLevel: ''
      }
      const genderIndex = GENDER_OPTIONS.findIndex((option) => option.value === profile.gender)
      const activityIndex = ACTIVITY_OPTIONS.findIndex((option) => option.value === profile.activityLevel)

      this.setData({
        loadStatus: 'ready',
        hasExistingProfile: result.exists === true,
        profileVersion: result.profileVersion || 0,
        genderIndex,
        activityIndex,
        form: {
          gender: profile.gender || '',
          birthDate: profile.birthDate || '',
          heightCm: profile.heightCm === null || profile.heightCm === undefined ? '' : String(profile.heightCm),
          weightKg: this.pendingWeightPrefill || (profile.weightKg === null || profile.weightKg === undefined ? '' : String(profile.weightKg)),
          targetWeightKg: profile.targetWeightKg === null || profile.targetWeightKg === undefined ? '' : String(profile.targetWeightKg),
          activityLevel: profile.activityLevel || ''
        }
      })
    } catch (error) {
      this.setData({
        loadStatus: 'error',
        errorMessage: error.message || '暂时无法读取身体档案，请稍后重试'
      })
    }
  },

  retryLoad() {
    this.loadBodyProfile()
  },

  changeGender(event) {
    const genderIndex = Number(event.detail.value)
    this.setData({
      genderIndex,
      'form.gender': GENDER_OPTIONS[genderIndex].value,
      'fieldErrors.gender': '',
      errorMessage: ''
    })
  },

  changeBirthDate(event) {
    this.setData({ 'form.birthDate': event.detail.value, 'fieldErrors.birthDate': '', errorMessage: '' })
  },

  changeActivity(event) {
    const activityIndex = Number(event.detail.value)
    this.setData({
      activityIndex,
      'form.activityLevel': ACTIVITY_OPTIONS[activityIndex].value,
      'fieldErrors.activityLevel': '',
      errorMessage: ''
    })
  },

  changeNumber(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: event.detail.value, [`fieldErrors.${field}`]: '', errorMessage: '' })
  },

  async submit() {
    if (this.data.isSubmitting || this.data.loadStatus !== 'ready') return

    this.setData({ isSubmitting: true, fieldErrors: {}, errorMessage: '' })
    try {
      const result = await saveBodyProfile(this.data.form, this.data.profileVersion)
      wx.showToast({ title: '身体信息已保存', icon: 'success' })
      const app = getApp()
      const dismissed = Boolean(app.globalData && app.globalData.portraitOnboardingDismissed)
      if (!result.isFirstCompletion || dismissed) {
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      this.setData({
        profileVersion: result.profileVersion,
        showPortraitOnboarding: true
      })
    } catch (error) {
      if (error.code === ERROR_CODES.INVALID_PARAM) {
        this.setData({
          fieldErrors: error.fieldErrors || {},
          errorMessage: error.message || '请检查填写内容'
        })
      } else if (error.code === ERROR_CODES.PROFILE_VERSION_CONFLICT) {
        wx.showModal({
          title: '资料已更新',
          content: '身体档案已在其他页面更新，请重新加载最新资料后再修改。',
          showCancel: false,
          success: () => this.loadBodyProfile()
        })
      } else {
        this.setData({ errorMessage: error.message || '保存失败，请稍后重试' })
      }
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  openPortraitEditor() {
    if (this.data.isOpeningPortraitEditor) return
    this.setData({ isOpeningPortraitEditor: true, showPortraitOnboarding: false })
    wx.redirectTo({
      url: '/pages/portrait-editor/portrait-editor?source=initial',
      fail: () => {
        this.setData({ isOpeningPortraitEditor: false, showPortraitOnboarding: true })
        wx.showToast({ title: '暂时无法打开画像页面', icon: 'none' })
      }
    })
  },

  skipPortraitOnboarding() {
    const app = getApp()
    if (app.globalData) app.globalData.portraitOnboardingDismissed = true
    this.setData({ showPortraitOnboarding: false })
    wx.navigateBack()
  }
})
