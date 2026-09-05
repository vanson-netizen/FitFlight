const { TODAY_PLAN_PAGE_STATUS, MEAL_DISPLAY_MODE } = require('../../constants/today-plan')
const { getTodayPlanDisplayModel } = require('../../services/today-plan-service')
const trainingPlanService = require('../../services/training-plan-service')
const { beijingDateKey, beijingDateLabel } = require('../../utils/beijing-date')

const CHECKIN_FIELDS = { exercise: 'exerciseCompleted', diet: 'dietCompleted', sleep: 'sleepCompleted' }

function progressFromCheckin(checkin) {
  const completedCount = ['exerciseCompleted', 'dietCompleted', 'sleepCompleted'].filter((field) => checkin && checkin[field]).length
  return { completedCount, totalCount: 3, percent: Number(((completedCount / 3) * 100).toFixed(2)) }
}

function checkinErrorMessage(error) {
  const messages = {
    INVALID_PARAM: '打卡参数无效，请重新进入页面',
    UNAUTHORIZED: '无法确认用户身份，请重新进入小程序',
    PLAN_NOT_FOUND: '没有找到对应方案',
    PLAN_NOT_ACTIVE: '当前方案不可打卡',
    DAY_PLAN_NOT_FOUND: '当前方案没有当天安排',
    CHECKIN_VERSION_CONFLICT: '状态已在其他操作中更新，正在刷新'
  }
  return messages[error && error.code] || error.message || '打卡保存失败，请稍后重试'
}

Page({
  data: {
    pageStatus: TODAY_PLAN_PAGE_STATUS.LOADING,
    today: beijingDateKey(),
    todayLabel: beijingDateLabel(),
    displayModel: null,
    errorMessage: '',
    isLoading: false,
    checkinLoading: false,
    checkinLoadError: '',
    checkin: null,
    checkinReadOnly: false,
    savingItems: {},
    emptyKind: ''
  },

  onShow() {
    const now = new Date()
    this.setData({ today: beijingDateKey(now), todayLabel: beijingDateLabel(now) })
    this.loadTodayPlan()
  },

  async loadTodayPlan() {
    if (this.data.isLoading) return
    const requestId = (this.loadRequestId || 0) + 1
    this.loadRequestId = requestId
    this.setData({ pageStatus: TODAY_PLAN_PAGE_STATUS.LOADING, isLoading: true, errorMessage: '' })
    try {
      const result = await getTodayPlanDisplayModel(this.data.today)
      if (requestId !== this.loadRequestId) return
      this.setData({ pageStatus: result.status, displayModel: result.displayModel, emptyKind: result.emptyKind || '', isLoading: false, checkin: null, checkinLoadError: '' })
      if (result.displayModel) await this.loadDailyCheckin(requestId, result.displayModel)
    } catch (error) {
      if (requestId !== this.loadRequestId) return
      this.setData({
        pageStatus: TODAY_PLAN_PAGE_STATUS.ERROR,
        displayModel: null,
        isLoading: false,
        errorMessage: error.message || '暂时无法读取今日方案，请稍后重试'
      })
    }
  },

  async loadDailyCheckin(pageRequestId = this.loadRequestId, model = this.data.displayModel) {
    if (!model) return
    const checkinRequestId = (this.checkinRequestId || 0) + 1
    this.checkinRequestId = checkinRequestId
    this.setData({ checkinLoading: true, checkinLoadError: '' })
    try {
      const result = await trainingPlanService.getDailyCheckin(model.planId, model.date)
      if (pageRequestId !== this.loadRequestId || checkinRequestId !== this.checkinRequestId) return
      this.setData({ checkin: result.checkin, checkinReadOnly: result.readOnly === true, checkinLoading: false, 'displayModel.progress': progressFromCheckin(result.checkin) })
    } catch (error) {
      if (pageRequestId !== this.loadRequestId || checkinRequestId !== this.checkinRequestId) return
      this.setData({ checkinLoading: false, checkinLoadError: checkinErrorMessage(error), checkin: null })
    }
  },

  retryDailyCheckin() {
    this.loadDailyCheckin(this.loadRequestId, this.data.displayModel)
  },

  async toggleCheckin(event) {
    const item = event.currentTarget.dataset.item
    const field = CHECKIN_FIELDS[item]
    const model = this.data.displayModel
    const current = this.data.checkin
    if (!field || !model || !current || this.data.checkinReadOnly || this.data.savingItems[item]) return
    const previous = { ...current }
    const optimistic = { ...current, [field]: !current[field] }
    optimistic.completedCount = progressFromCheckin(optimistic).completedCount
    this.checkinOperationIds = this.checkinOperationIds || {}
    const operationId = (this.checkinOperationIds[item] || 0) + 1
    this.checkinOperationIds[item] = operationId
    this.setData({ [`savingItems.${item}`]: true, checkin: optimistic, 'displayModel.progress': progressFromCheckin(optimistic) })
    try {
      const result = await trainingPlanService.toggleDailyCheckin(model.planId, model.date, item, optimistic[field], previous.revision)
      if (operationId !== this.checkinOperationIds[item]) return
      this.checkinRequestId = (this.checkinRequestId || 0) + 1
      this.setData({ checkin: result.checkin, [`savingItems.${item}`]: false, 'displayModel.progress': progressFromCheckin(result.checkin) })
    } catch (error) {
      if (operationId !== this.checkinOperationIds[item]) return
      this.setData({ checkin: previous, [`savingItems.${item}`]: false, 'displayModel.progress': progressFromCheckin(previous) })
      wx.showToast({ title: checkinErrorMessage(error), icon: 'none' })
      if (error && error.code === 'CHECKIN_VERSION_CONFLICT') this.loadDailyCheckin(this.loadRequestId, model)
    }
  },

  retryLoad() {
    this.loadTodayPlan()
  },

  openHealthRecords() {
    wx.navigateTo({
      url: '/pages/health-records/health-records',
      fail: () => wx.showToast({ title: '暂时无法打开健康记录', icon: 'none' })
    })
  },

  openJournal() {
    wx.navigateTo({
      url: '/pages/journal-notebooks/journal-notebooks',
      fail: () => wx.showToast({ title: '暂时无法打开日志', icon: 'none' })
    })
  },

  showComingSoon(event) {
    if (this.showingToast) return
    this.showingToast = true
    const feature = event.currentTarget.dataset.feature || '该功能'
    wx.showToast({
      title: `${feature}功能准备中`,
      icon: 'none',
      complete: () => setTimeout(() => { this.showingToast = false }, 300)
    })
  },

  showRecordComingSoon() {
    if (this.showingToast) return
    this.showingToast = true
    wx.showToast({
      title: '记录功能将在后续接入',
      icon: 'none',
      complete: () => setTimeout(() => { this.showingToast = false }, 300)
    })
  },

  switchMealMode(event) {
    const mode = event.currentTarget.dataset.mode
    const current = this.data.displayModel
    if (!current || ![MEAL_DISPLAY_MODE.RECOMMENDED, MEAL_DISPLAY_MODE.ACTUAL].includes(mode)) return
    if (mode === MEAL_DISPLAY_MODE.ACTUAL && !current.nutrition.actualMealsExist) return
    const labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }
    const meals = mode === MEAL_DISPLAY_MODE.ACTUAL ? current.nutrition.actualMeals : current.nutrition.recommendedMeals
    const displayedMealSections = ['breakfast', 'lunch', 'dinner'].map((key) => ({ key, label: labels[key], items: meals[key] || [] }))
    this.setData({
      'displayModel.nutrition.displayMode': mode,
      'displayModel.nutrition.displayedMealSections': displayedMealSections
    })
  },

  openSafetyScreening() { wx.navigateTo({ url: '/pages/safety-screening/safety-screening' }) },

  openMyPlan() { wx.navigateTo({ url: '/pages/my-plan/my-plan' }) },

  openMine() {
    wx.redirectTo({
      url: '/pages/index/index',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  }
  ,openFifi() {
    wx.redirectTo({
      url: '/pages/fifi/fifi',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  }
  ,openCommunity() {
    wx.redirectTo({
      url: '/pages/community/community',
      fail: () => wx.showToast({ title: '暂时无法打开页面', icon: 'none' })
    })
  }
})
