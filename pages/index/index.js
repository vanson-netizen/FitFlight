// index.js
const { getUserProfile, saveUserProfile } = require('../../utils/user-profile')
const { getBodyProfile } = require('../../services/user-profile-service')
const fifiGrowthService = require('../../services/fifi-growth-service')

function buildHomeAchievementSlots(achievements = []) {
  return achievements.filter((achievement) => achievement.unlocked !== false).slice(0, 2)
    .map((achievement) => ({ ...achievement, unlocked: true }))
}

Page({
  data: {
    isLoading: true,
    isSavingAvatar: false,
    isEditing: false,
    userProfile: null,
    form: {
      nickName: '',
      avatarUrl: ''
    },
    errorMessage: '',
    profileStatus: 'loading',
    bodyProfileErrorMessage: '',
    showBodyProfileOnboarding: false,
    isOpeningBodyProfile: false,
    growthStatus: 'loading',
    growthErrorMessage: '',
    growthModel: null
  },

  onLoad() {
    this.loadUserProfile()
  },

  onShow() {
    this.setData({ isOpeningBodyProfile: false })
    if (!this.data.isLoading && this.data.userProfile && !this.data.isEditing) {
      this.loadBodyProfile()
      this.loadGrowth()
    }
  },

  async loadGrowth() {
    const requestId = (this.growthRequestId || 0) + 1
    this.growthRequestId = requestId
    this.setData({ growthStatus: 'loading', growthErrorMessage: '' })
    try {
      const model = await fifiGrowthService.loadFifiGrowthData()
      if (requestId !== this.growthRequestId) return
      this.setData({
        growthStatus: model.cultivationDays > 0 ? 'ready' : 'empty',
        growthModel: { ...model, homeAchievements: buildHomeAchievementSlots(model.achievements) },
        growthErrorMessage: ''
      })
    } catch (error) {
      if (requestId !== this.growthRequestId) return
      this.setData({
        growthStatus: 'error',
        growthModel: null,
        growthErrorMessage: (error && error.message) || '暂时无法读取成长记录，请稍后重试'
      })
    }
  },

  retryGrowth() {
    this.loadGrowth()
  },

  async loadBodyProfile() {
    const requestId = (this.bodyProfileRequestId || 0) + 1
    this.bodyProfileRequestId = requestId
    this.setData({
      profileStatus: 'loading',
      bodyProfileErrorMessage: '',
      showBodyProfileOnboarding: false
    })

    try {
      const result = await getBodyProfile()
      if (requestId !== this.bodyProfileRequestId) return

      if (!result.exists || !result.isComplete) {
        const app = getApp()
        const dismissed = Boolean(app.globalData && app.globalData.bodyProfileOnboardingDismissed)
        this.setData({
          profileStatus: 'incomplete',
          showBodyProfileOnboarding: !dismissed
        })
        return
      }

      this.setData({
        profileStatus: 'complete',
        showBodyProfileOnboarding: false
      })
    } catch (error) {
      if (requestId !== this.bodyProfileRequestId) return
      this.setData({
        profileStatus: 'error',
        bodyProfileErrorMessage: error.message || '暂时无法读取身体档案，请稍后重试',
        showBodyProfileOnboarding: false
      })
    }
  },

  retryBodyProfile() {
    this.loadBodyProfile()
  },

  loadUserProfile(showLoading = true) {
    if (showLoading) {
      this.setData({ isLoading: true })
    }

    try {
      const userProfile = getUserProfile()
      this.setData({
        isLoading: false,
        isEditing: !userProfile,
        userProfile,
        form: userProfile || { nickName: '', avatarUrl: '' },
        errorMessage: ''
      })
    } catch (error) {
      this.setData({
        isLoading: false,
        isEditing: true,
        userProfile: null,
        errorMessage: '暂时无法读取资料，请重新填写'
      })
    }
  },

  chooseAvatar(event) {
    const avatarUrl = event.detail.avatarUrl

    if (!avatarUrl) {
      this.setData({ errorMessage: '未能获取头像，请重新选择' })
      return
    }

    this.setData({ isSavingAvatar: true, errorMessage: '' })
    wx.saveFile({
      tempFilePath: avatarUrl,
      success: ({ savedFilePath }) => {
        this.setData({
          'form.avatarUrl': savedFilePath,
          isSavingAvatar: false
        })
      },
      fail: () => {
        this.setData({
          isSavingAvatar: false,
          errorMessage: '头像保存失败，请重新选择'
        })
      }
    })
  },

  changeNickName(event) {
    this.setData({
      'form.nickName': event.detail.value,
      errorMessage: ''
    })
  },

  submitProfile() {
    if (this.data.isSavingAvatar) {
      this.setData({ errorMessage: '头像正在保存，请稍候' })
      return
    }

    const nickName = this.data.form.nickName.trim()
    const avatarUrl = this.data.form.avatarUrl

    if (!avatarUrl) {
      this.setData({ errorMessage: '请选择头像' })
      return
    }

    if (!nickName) {
      this.setData({ errorMessage: '请输入昵称' })
      return
    }

    try {
      const userProfile = saveUserProfile({ nickName, avatarUrl })
      this.setData({
        isEditing: false,
        userProfile,
        form: userProfile,
        errorMessage: ''
      })
      wx.showToast({ title: '资料已保存', icon: 'success' })
      this.loadBodyProfile()
      this.loadGrowth()
    } catch (error) {
      this.setData({ errorMessage: '保存失败，请稍后重试' })
    }
  },

  editProfile() {
    this.setData({
      isEditing: true,
      form: this.data.userProfile,
      errorMessage: ''
    })
  },

  cancelEdit() {
    if (!this.data.userProfile) {
      return
    }

    this.setData({
      isEditing: false,
      form: this.data.userProfile,
      errorMessage: ''
    })
  },

  openBodyProfile() {
    if (this.data.isOpeningBodyProfile) return
    this.setData({ isOpeningBodyProfile: true, showBodyProfileOnboarding: false })
    wx.navigateTo({
      url: '/pages/body-profile/body-profile',
      fail: () => {
        this.setData({ isOpeningBodyProfile: false })
        wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
      }
    })
  },

  openMyPortrait() {
    wx.navigateTo({
      url: '/pages/my-portrait/my-portrait',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openMyPlan() {
    wx.navigateTo({
      url: '/pages/my-plan/my-plan',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/achievements',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openCultivation() {
    wx.navigateTo({
      url: '/pages/cultivation/cultivation',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openFifi() {
    wx.navigateTo({
      url: '/pages/fifi/fifi',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openCommunity() {
    wx.navigateTo({
      url: '/pages/community/community',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  openSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  },

  dismissBodyProfileOnboarding() {
    const app = getApp()
    if (app.globalData) app.globalData.bodyProfileOnboardingDismissed = true
    this.setData({ showBodyProfileOnboarding: false })
  }
})

module.exports.buildHomeAchievementSlots = buildHomeAchievementSlots
