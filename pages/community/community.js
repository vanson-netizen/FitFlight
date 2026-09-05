const { homeImage } = require('../../constants/community-resource-images')
const { imageErrorHandler } = require('../community-shared/image-fallback')
const { updateHomeLayout } = require('./home-layout')

Page({
  data: {
    homeScrollHeight: null, homeContentHeight: null,
    entries: [
      { id: 'sport', title: '运动', description: '发现校内外运动场地', route: '/pages/community-sport/community-sport', backgroundImage: '', themeClass: 'entry-sport' },
      { id: 'food', title: '饮食', description: '查找食堂与健康饮食', route: '/pages/community-food/community-food', backgroundImage: '', themeClass: 'entry-food' },
      { id: 'forum', title: '论坛', description: '查看校园健康分享', route: '/pages/community-forum/community-forum', backgroundImage: '', themeClass: 'entry-forum' }
    ].map((entry) => ({ ...entry, backgroundImage: homeImage(entry.id) }))
  },

  onReady() { updateHomeLayout(this) },
  onResize() { wx.nextTick(() => updateHomeLayout(this)) },
  onUnload() { this.homeDisposed = true },

  onImageError: imageErrorHandler('entries', 'id', 'backgroundImage'),
  openCategory(event) {
    const route = event.currentTarget.dataset.route
    if (!route) return
    wx.navigateTo({ url: route, fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' }) })
  },

  openFifi() { wx.redirectTo({ url: '/pages/fifi/fifi' }) },
  openCultivation() { wx.redirectTo({ url: '/pages/cultivation/cultivation' }) },
  openMine() { wx.redirectTo({ url: '/pages/index/index' }) }
})
