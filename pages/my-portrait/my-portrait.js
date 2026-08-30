const { getBodyProfile } = require('../../services/user-profile-service')

const GENDER_LABELS = { male: '男', female: '女', other: '其他' }
const ACTIVITY_LABELS = {
  sedentary: '久坐（几乎不运动）',
  light: '轻度（每周 1–2 次）',
  moderate: '中度（每周 3–4 次）',
  active: '活跃（每周 5–6 次）',
  very_active: '非常活跃（几乎每天）'
}

Page({
  data: {
    profileStatus: 'loading',
    bodyProfile: null,
    errorMessage: ''
  },

  onShow() {
    this.loadBodyProfile()
  },

  async loadBodyProfile() {
    const requestId = (this.requestId || 0) + 1
    this.requestId = requestId
    this.setData({ profileStatus: 'loading', bodyProfile: null, errorMessage: '' })

    try {
      const result = await getBodyProfile()
      if (requestId !== this.requestId) return
      if (!result.exists || !result.isComplete) {
        this.setData({ profileStatus: 'incomplete' })
        return
      }

      const profile = result.profile
      this.setData({
        profileStatus: 'complete',
        bodyProfile: {
          gender: GENDER_LABELS[profile.gender] || '暂未设置',
          birthDate: profile.birthDate || '暂未设置',
          height: `${profile.heightCm} cm`,
          weight: `${profile.weightKg} kg`,
          targetWeight: profile.targetWeightKg === null ? '暂未设置' : `${profile.targetWeightKg} kg`,
          activityLevel: ACTIVITY_LABELS[profile.activityLevel] || '暂未设置'
        }
      })
    } catch (error) {
      if (requestId !== this.requestId) return
      this.setData({
        profileStatus: 'error',
        errorMessage: error.message || '暂时无法读取身体档案，请稍后重试'
      })
    }
  },

  retryLoad() {
    this.loadBodyProfile()
  },

  openBodyProfile() {
    wx.navigateTo({
      url: '/pages/body-profile/body-profile',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  }
})
