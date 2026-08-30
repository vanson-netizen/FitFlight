// index.js
const { getUserProfile, saveUserProfile } = require('../../utils/user-profile')

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
    errorMessage: ''
  },

  onLoad() {
    this.loadUserProfile()
  },

  onShow() {
    if (!this.data.isLoading) {
      this.loadUserProfile(false)
    }
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
    wx.navigateTo({ url: '/pages/body-profile/body-profile' })
  }
})
