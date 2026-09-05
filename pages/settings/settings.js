const { APP_VERSION } = require('../../constants/app-info')
const { clearSafeLocalCache } = require('../../utils/local-cache')

Page({
  data: { appVersion: APP_VERSION, operation: '', errorMessage: '' },

  openPermissionSettings() {
    if (this.data.operation) return
    this.setData({ operation: 'permission', errorMessage: '' })
    wx.openSetting({
      success: (result) => {
        const authSetting = result && result.authSetting ? result.authSetting : {}
        if (!Object.keys(authSetting).length) {
          wx.showToast({ title: '暂无可管理的权限', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ errorMessage: '无法打开权限管理，请稍后重试或前往微信系统设置' })
      },
      complete: () => this.setData({ operation: '' })
    })
  },

  openDataUsage() { this.navigate('/pages/data-usage/data-usage') },
  openAbout() { this.navigate('/pages/about/about') },

  confirmClearCache() {
    if (this.data.operation) return
    wx.showModal({
      title: '清除本地缓存',
      content: '只会清除未保存的日志草稿和安全临时缓存，不会删除账号资料或任何云端数据。是否继续？',
      confirmText: '确认清除',
      success: (result) => { if (result.confirm) this.clearCache() }
    })
  },

  clearCache() {
    this.setData({ operation: 'cache', errorMessage: '' })
    try {
      const result = clearSafeLocalCache()
      if (result.failedCount) {
        this.setData({ errorMessage: `已清除 ${result.removedCount} 项，另有 ${result.failedCount} 项清除失败` })
      } else {
        const title = result.removedCount ? `已清除 ${result.removedCount} 项草稿缓存` : '没有可清除的缓存'
        wx.showToast({ title, icon: 'none', duration: 2200 })
      }
    } catch (error) {
      this.setData({ errorMessage: '缓存清除失败，请稍后重试' })
    } finally {
      this.setData({ operation: '' })
    }
  },

  navigate(url) {
    wx.navigateTo({ url, fail: () => this.setData({ errorMessage: '暂时无法打开页面，请稍后重试' }) })
  }
})
