const fifiGrowthService = require('../../services/fifi-growth-service')
const { ACHIEVEMENT_CONFIG } = require('../../constants/fifi')

Page({
  data: {
    pageStatus: 'loading',
    errorMessage: '',
    achievements: [],
    unlockedCount: 0,
    totalCount: ACHIEVEMENT_CONFIG.length,
    selectedAchievement: null
  },

  onShow() {
    this.loadAchievements()
  },

  async loadAchievements() {
    const requestId = (this.loadRequestId || 0) + 1
    this.loadRequestId = requestId
    this.setData({ pageStatus: 'loading', errorMessage: '', selectedAchievement: null })
    try {
      const model = await fifiGrowthService.loadFifiGrowthData()
      if (requestId !== this.loadRequestId) return
      this.setData({
        pageStatus: model.achievements.length ? 'ready' : 'empty',
        achievements: model.achievementCatalog,
        unlockedCount: model.achievements.length
      })
    } catch (error) {
      if (requestId !== this.loadRequestId) return
      this.setData({
        pageStatus: 'error',
        achievements: [],
        unlockedCount: 0,
        errorMessage: (error && error.message) || '暂时无法读取成就，请稍后重试'
      })
    }
  },

  retryLoad() {
    this.loadAchievements()
  },

  selectAchievement(event) {
    const key = event.currentTarget.dataset.key
    const selectedAchievement = this.data.achievements.find((achievement) => achievement.key === key) || null
    this.setData({ selectedAchievement })
  }
})
