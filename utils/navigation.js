const { HOME_NAVIGATION_METHOD, HOME_ROUTES, PAGE_HOME } = require('../constants/navigation')

function safeNavigateBack() {
  const pages = getCurrentPages()
  const route = (pages[pages.length - 1] || {}).route || ''
  const home = PAGE_HOME[route.replace(/^\//, '')] || HOME_ROUTES.mine
  const cancelled = error => /cancel/i.test((error || {}).errMsg || '')
  const fallback = () => {
    // 当前四个主页使用自绘底栏；只有注册的原生 TabBar 才能 switchTab。
    wx[HOME_NAVIGATION_METHOD]({
      url: home,
      fail(error) {
        if (cancelled(error)) return
        console.warn('[navigation] 返回主页失败', home, error)
        wx.showToast({ title: '返回失败，请稍后重试', icon: 'none' })
      }
    })
  }
  if (pages.length > 1) {
    wx.navigateBack({ delta: 1, fail(error) { if (!cancelled(error)) fallback() } })
  } else {
    fallback()
  }
}

module.exports = { safeNavigateBack }
