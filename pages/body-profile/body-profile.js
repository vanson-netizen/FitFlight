const { ERROR_CODES, saveBodyProfile } = require('../../services/user-profile-service')

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
    isSubmitting: false
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
    if (this.data.isSubmitting) return

    this.setData({ isSubmitting: true, fieldErrors: {}, errorMessage: '' })
    try {
      await saveBodyProfile(this.data.form)
      wx.showToast({ title: '身体信息已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (error) {
      if (error.code === ERROR_CODES.INVALID_PARAM) {
        this.setData({
          fieldErrors: error.fieldErrors || {},
          errorMessage: error.message || '请检查填写内容'
        })
      } else {
        this.setData({ errorMessage: error.message || '保存失败，请稍后重试' })
      }
    } finally {
      this.setData({ isSubmitting: false })
    }
  }
})
