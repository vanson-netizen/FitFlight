// app.js
const { CLOUD_ENV_ID } = require('./constants/cloud')

App({
  globalData: {
    bodyProfileOnboardingDismissed: false,
    portraitOnboardingDismissed: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发，请升级微信开发者工具或基础库')
      return
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    })
  }
})
