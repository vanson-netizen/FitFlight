// app.js
App({
  globalData: {
    bodyProfileOnboardingDismissed: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请升级微信开发者工具或基础库')
      return
    }

    // 不写死环境 ID，使用微信开发者工具中当前选择的云开发环境。
    wx.cloud.init({
      traceUser: true
    })
  }
})
