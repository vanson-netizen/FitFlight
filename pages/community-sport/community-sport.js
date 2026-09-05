const { COMMUNITY_PAGE_STATUS, SPORT_CATEGORIES } = require('../../constants/community')
const { loadResourceList } = require('../../services/community-resource-service')
const { updateResourceLayout, logResourceView } = require('../community-resource/resource-layout')
const { imageErrorHandler } = require('../community-shared/image-fallback')

Page({
  onImageError: imageErrorHandler('resources', 'resourceId', 'displayImage'),
  data: { categories: SPORT_CATEGORIES, selectedCategoryId: SPORT_CATEGORIES[0].id, selectedCategoryLabel: SPORT_CATEGORIES[0].label, pageStatus: COMMUNITY_PAGE_STATUS.LOADING, resources: [], errorMessage: '', resourceScrollTop: 0 },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this.setData({ layoutHeight: info.windowHeight, resourceListHeight: info.windowHeight })
    this.loadCategory(this.data.selectedCategoryId)
  },
  onReady() { updateResourceLayout(this) },
  onResize() { wx.nextTick(() => updateResourceLayout(this)) },
  onUnload() { this.resourceDisposed = true; this.requestId = (this.requestId || 0) + 1 },
  selectCategory(event) {
    const categoryId = event.currentTarget.dataset.category
    if (!categoryId || categoryId === this.data.selectedCategoryId) return
    const category = SPORT_CATEGORIES.find((item) => item.id === categoryId)
    if (!category) return
    this.resetResourceScroll()
    this.setData({ selectedCategoryId: categoryId, selectedCategoryLabel: category.label })
    this.loadCategory(categoryId)
  },
  async loadCategory(categoryId) {
    const requestId = (this.requestId || 0) + 1
    this.requestId = requestId
    this.setData({ pageStatus: COMMUNITY_PAGE_STATUS.LOADING, resources: [], errorMessage: '' })
    try {
      const result = await loadResourceList('sport', categoryId)
      if (requestId !== this.requestId) return
      this.setData({ pageStatus: result.status, resources: result.items, errorMessage: result.errorMessage || '' },
        () => logResourceView(this, 'sport', categoryId))
    } catch (error) {
      if (requestId !== this.requestId) return
      this.setData({ pageStatus: COMMUNITY_PAGE_STATUS.ERROR, resources: [], errorMessage: (error && error.message) || '资源加载失败，请稍后重试' },
        () => logResourceView(this, 'sport', categoryId))
    }
  },
  resetResourceScroll() {
    this.setData({ resourceScrollTop: 1 })
    wx.nextTick(() => { if (!this.resourceDisposed) this.setData({ resourceScrollTop: 0 }) })
  },
  retryLoad() { this.loadCategory(this.data.selectedCategoryId) }
})
