const { FIFI_PAGE_STATUS, FIFI_DIALOGUES } = require('../../constants/fifi')
const { FIFI_APPEARANCE } = require('../../constants/fifi-appearance')
const { buildAppearanceLayout } = require('./appearance-layout')
const fifiGrowthService = require('../../services/fifi-growth-service')

function exerciseLabel(status) {
  return { completed: '已完成', scheduled_rest: '休息日', user_paused: '今日休眠', pending: '未完成' }[status] || '未完成'
}

Page({
  data: {
    pageStatus: FIFI_PAGE_STATUS.LOADING,
    errorMessage: '',
    model: null,
    dialogue: FIFI_DIALOGUES.normal[0],
    appearance: FIFI_APPEARANCE,
    backgroundStyle: '',
    petAreaStyle: '',
    backgroundLoadError: false,
    imageLoadError: false,
    taskItems: []
  },

  onShow() { this.loadGrowth() },

  onReady() { this.measureAppearance() },
  onResize() { this.measureAppearance() },
  measureAppearance() {
    wx.nextTick(() => {
      this.createSelectorQuery().select('.fifi-scene').boundingClientRect()
        .select('.fifi-scroll').boundingClientRect().exec((rects) => {
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
          const layout = buildAppearanceLayout(rects[0], rects[1], info.windowWidth)
          if (layout) this.setData(layout)
        })
    })
  },

  async loadGrowth() {
    const requestId = (this.loadRequestId || 0) + 1
    this.loadRequestId = requestId
    this.setData({ pageStatus: FIFI_PAGE_STATUS.LOADING, errorMessage: '' })
    try {
      const model = await fifiGrowthService.loadFifiGrowthData()
      if (requestId !== this.loadRequestId) return
      const today = model.today
      this.setData({
        pageStatus: model.status,
        model,
        dialogue: today.defaultDialogue,
        imageLoadError: false,
        taskItems: [
          { key: 'exercise', name: '锻炼', status: exerciseLabel(today.exerciseStatus), complete: today.exerciseDone, dormant: today.exerciseStatus === 'user_paused' },
          { key: 'diet', name: '饮食', status: today.dietCompleted ? '已完成' : '未完成', complete: today.dietCompleted },
          { key: 'sleep', name: '作息', status: today.sleepCompleted ? '已完成' : '未完成', complete: today.sleepCompleted }
        ]
      })
    } catch (error) {
      if (requestId !== this.loadRequestId) return
      this.setData({ pageStatus: FIFI_PAGE_STATUS.ERROR, model: null, errorMessage: (error && error.message) || '暂时无法读取培养记录，请稍后重试' })
    }
  },

  retryLoad() { this.loadGrowth() },

  changeDialogue() {
    if (!this.data.model) return
    const state = this.data.model.today.state
    const choices = FIFI_DIALOGUES[state]
    const currentIndex = choices.indexOf(this.data.dialogue)
    const step = choices.length > 1 ? 1 + Math.floor(Math.random() * (choices.length - 1)) : 0
    this.setData({ dialogue: choices[(Math.max(currentIndex, 0) + step) % choices.length] })
  },

  handleImageError() { this.setData({ imageLoadError: true }) },
  handleBackgroundError() { this.setData({ backgroundLoadError: true }) },
  openCultivation() { wx.redirectTo({ url: '/pages/cultivation/cultivation', fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' }) }) },
  openCommunity() { wx.redirectTo({ url: '/pages/community/community' }) },
  openMine() { wx.redirectTo({ url: '/pages/index/index' }) }
})

module.exports.exerciseLabel = exerciseLabel
