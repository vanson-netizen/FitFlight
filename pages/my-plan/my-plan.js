const trainingPlanService = require('../../services/training-plan-service')
const { PLAN_ERROR_CODES, PLAN_STATUS } = require('../../constants/training-plan')
const { TRAINING_GOAL_LABELS } = require('../../constants/user-portrait')
const portraitService = require('../../services/user-portrait-service')

function buildViewState(planStatus, activePlan = null) {
  return {
    isNone: planStatus === PLAN_STATUS.NONE || (planStatus === PLAN_STATUS.PENDING_CONFIRMATION && !activePlan),
    isPending: planStatus === PLAN_STATUS.PENDING_CONFIRMATION && Boolean(activePlan),
    isGenerating: planStatus === PLAN_STATUS.GENERATING,
    isActive: planStatus === PLAN_STATUS.ACTIVE,
    isOutdated: planStatus === PLAN_STATUS.OUTDATED,
    isFailed: planStatus === PLAN_STATUS.GENERATION_FAILED,
    isNotConfigured: planStatus === PLAN_STATUS.GENERATOR_NOT_CONFIGURED
  }
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const DAY_TYPE_LABELS = { training: '训练', light_activity: '轻活动', recovery: '恢复' }

function safeArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined && item !== '') : []
}

function safeText(value, fallback = '--') {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function formatShortDate(value) {
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${Number(match[2])}月${Number(match[3])}日` : safeText(value)
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '日期待确认'
  return `${formatShortDate(startDate)}—${formatShortDate(endDate)}`
}

function formatGeneratedDate(value) {
  if (!value) return '--'
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && value.$date) return formatGeneratedDate(value.$date)
  return '--'
}

function weekdayOf(dateKey) {
  const match = typeof dateKey === 'string' && dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return formatShortDate(dateKey)
  return WEEKDAY_LABELS[new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay()]
}

function buildWeekView(week, dailyPlans, todayKey) {
  const weekNumber = Number.isInteger(week.weekNumber) ? week.weekNumber : '--'
  const weekDays = safeArray(dailyPlans).filter((day) => {
    return Number(day.weekIndex || (day.cyclePosition && day.cyclePosition.weekNumber)) === Number(week.weekNumber)
  }).sort((left, right) => safeText(left.date, '').localeCompare(safeText(right.date, '')))
  const focus = safeArray(week.focus)
  return {
    ...week,
    weekNumber,
    stageLabel: safeText(week.stageName || week.stage, '阶段待确认'),
    dateRange: formatDateRange(week.startDate, week.endDate),
    plannedTrainingDaysLabel: Number.isInteger(week.plannedTrainingDays) ? `${week.plannedTrainingDays} 天` : '待确认',
    sessionMinutesLabel: Number.isFinite(Number(week.expectedSessionDurationMinutes)) ? `${week.expectedSessionDurationMinutes} 分钟` : '以方案实际安排为准',
    intensityLabel: safeText(week.intensityRange, '旧方案未保存强度范围'),
    focusText: focus[0] || '本周重点暂未写入旧方案快照',
    isCurrent: Boolean(week.startDate && week.endDate && week.startDate <= todayKey && week.endDate >= todayKey),
    daySummaries: weekDays.filter((day) => day.dayType === 'training').map((day) => {
      const exercise = day.exercise || day.plannedExercise || {}
      return {
        date: formatShortDate(day.date),
        weekday: exercise.trainingDayLabel || (day.trainingDayIndex ? `第${day.trainingDayIndex}训练日` : weekdayOf(day.date)),
        typeLabel: safeText(day.title || DAY_TYPE_LABELS[day.dayType], '安排待确认'),
        durationLabel: Number.isFinite(Number(exercise.totalDurationMinutes)) ? `${exercise.totalDurationMinutes} 分钟` : (day.dayType === 'recovery' ? '恢复日' : '时长待确认')
      }
    }),
    trainingStructure: safeArray(week.trainingStructure),
    progressionFocus: safeText(week.progressionFocus || focus[0], '本周按原方案节奏完成并注意恢复'),
    hasDetails: weekDays.length > 0 || safeArray(week.trainingStructure).length > 0
  }
}

function buildPlanView(activePlan, currentGoal = '', today = new Date()) {
  if (!activePlan) return null
  const content = activePlan.content || {}
  const summary = content.summary || {}
  const rawWeeks = content.cycle && Array.isArray(content.cycle.weeks) ? content.cycle.weeks : []
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const weeks = rawWeeks.slice().sort((left, right) => Number(left.weekNumber || 0) - Number(right.weekNumber || 0)).map((week) => buildWeekView(week, content.dailyPlans, todayKey))
  const currentWeek = weeks.find((week) => week.isCurrent) || weeks[0] || null
  const trainingPrinciples = safeArray(summary.trainingPrinciples || summary.trainingFocus)
  const nutritionPrinciples = safeArray(summary.nutritionPrinciples)
  const sleepPrinciples = safeArray(summary.sleepPrinciples)
  const savedLifestyle = safeArray(summary.lifestylePrinciples || summary.nutritionPrinciples)
  const lifestylePrinciples = [
    ...savedLifestyle.filter((item) => !String(item).includes('饮水')).slice(0, 1),
    savedLifestyle.find((item) => String(item).includes('饮水')) || '分次、规律饮水（约 6—8 杯，按个人情况调整）',
    ...sleepPrinciples
  ].slice(0, 3)
  const safetyNotices = safeArray(summary.safetyNotices)
  const trainingSnapshots = safeArray(content.dailyPlans).filter((day) => day && day.dayType === 'training')
  const hasExecutableTraining = trainingSnapshots.length > 0 && trainingSnapshots.every((day) => {
    const exercise = day.plannedExercise || day.exercise || {}
    return Number.isInteger(exercise.trainingDayIndex) && Boolean(exercise.theme) && exercise.warmup && Array.isArray(exercise.mainExercises) && exercise.mainExercises.length > 0 && exercise.aerobic && exercise.cooldown
  })
  return {
    isLegacy: !content.summary || !weeks.length || !hasExecutableTraining,
    hasExecutableTraining,
    planName: summary.planName || '历史培养方案', goal: summary.goal || '', goalLabel: TRAINING_GOAL_LABELS[summary.goal] || '培养目标待补充',
    currentGoal, currentGoalLabel: TRAINING_GOAL_LABELS[currentGoal] || '暂未设置', goalChanged: Boolean(summary.goal && currentGoal && summary.goal !== currentGoal),
    startDate: summary.startDate || content.cycleStartDate || '--', endDate: summary.endDate || content.cycleEndDate || '--',
    dateRange: formatDateRange(summary.startDate || content.cycleStartDate, summary.endDate || content.cycleEndDate),
    currentWeekNumber: currentWeek ? currentWeek.weekNumber : '--', currentStage: currentWeek ? currentWeek.stageLabel : safeText(summary.currentStage, '阶段待确认'),
    trainingDaysPerWeek: Number.isFinite(Number(summary.trainingDaysPerWeek)) ? `${summary.trainingDaysPerWeek} 天` : '待确认',
    sessionMinutes: Number.isFinite(Number(summary.expectedSessionDurationMinutes)) ? `${summary.expectedSessionDurationMinutes} 分钟` : '待确认',
    trainingPrinciples, nutritionPrinciples, sleepPrinciples, lifestylePrinciples,
    coreGoal: trainingPrinciples[0] || safeText(summary.planName, '核心目标未写入旧方案快照'),
    explanationSummary: '查看训练、饮食、作息与安全说明',
    arrangementReasons: safeArray(summary.arrangementReasons || summary.rationale),
    reviewDate: safeText(summary.reviewDate), safetyNotices, weeks,
    ruleVersion: safeText(activePlan.ruleVersion || content.ruleVersion),
    exerciseLibraryVersion: safeText(activePlan.exerciseLibraryVersion || content.exerciseLibraryVersion),
    templateVersion: safeText(activePlan.templateVersion || content.templateVersion),
    profileVersion: safeText(activePlan.profileVersion || content.profileVersion),
    portraitVersion: safeText(activePlan.portraitVersion || content.portraitVersion),
    generatedDate: formatGeneratedDate(activePlan.generatedAt || content.generatedAt),
    ruleReviewStatus: safeText(content.ruleReviewStatus || activePlan.ruleReviewStatus, '历史版本'), resourceDataVersion: safeText(content.resourceDataVersion),
    isProductDraft: (content.ruleReviewStatus || activePlan.ruleReviewStatus) === 'product_draft',
    disclaimer: safeText(content.disclaimer, '仅供健康管理参考，医疗问题请咨询专业医生。')
  }
}

Page({
  data: {
    loadStatus: 'loading',
    viewState: buildViewState(PLAN_STATUS.NONE),
    activePlan: null,
    planView: null,
    errorMessage: '',
    isRequesting: false,
    generationRequestId: '',
    planEligibilityStatus: 'incomplete'
    ,currentProfileVersion: 0,
    currentPortraitVersion: 0,
    currentGoal: '',
    expandedWeekNumber: null,
    isExplanationOpen: false
  },

  onShow() {
    this.loadPlanStatus()
  },

  async loadPlanStatus() {
    const requestId = (this.loadRequestId || 0) + 1
    this.loadRequestId = requestId
    this.setData({ loadStatus: 'loading', errorMessage: '' })
    try {
      const [result, portraitResult] = await Promise.all([trainingPlanService.getPlanStatus(), portraitService.getPortrait()])
      if (requestId !== this.loadRequestId) return
      const planView = buildPlanView(result.activePlan, portraitResult.portrait && portraitResult.portrait.trainingGoal ? portraitResult.portrait.trainingGoal.value : '')
      this.setData({
        loadStatus: 'ready',
        viewState: buildViewState(result.planStatus, result.activePlan),
        activePlan: result.activePlan || null,
        planView,
        expandedWeekNumber: planView && planView.weeks.length ? planView.currentWeekNumber : null,
        isExplanationOpen: false,
        planEligibilityStatus: portraitResult.planEligibilityStatus || 'incomplete'
        ,currentProfileVersion: portraitResult.profileVersion || 0,
        currentPortraitVersion: portraitResult.portrait ? portraitResult.portrait.portraitVersion : 0,
        currentGoal: portraitResult.portrait && portraitResult.portrait.trainingGoal ? portraitResult.portrait.trainingGoal.value : ''
      })
    } catch (error) {
      if (requestId !== this.loadRequestId) return
      this.setData({ loadStatus: 'error', errorMessage: error.message || '暂时无法读取方案状态' })
    }
  },

  retryLoad() {
    this.loadPlanStatus()
  },

  toggleWeek(event) {
    const weekNumber = Number(event.currentTarget.dataset.week)
    this.setData({ expandedWeekNumber: this.data.expandedWeekNumber === weekNumber ? null : weekNumber })
  },

  openExplanation() {
    this.setData({ isExplanationOpen: true })
  },

  closeExplanation() {
    this.setData({ isExplanationOpen: false })
  },

  preventModalClose() {},

  requestGeneration() {
    if (this.data.planEligibilityStatus !== 'eligible') return this.openSafetyScreening()
    const requestId = this.data.generationRequestId || trainingPlanService.createRequestId()
    this.setData({ generationRequestId: requestId })
    this.runGeneration(() => trainingPlanService.requestGeneration(this.data.activePlan ? 'adjustment' : 'initial', requestId, { profileVersion: this.data.currentProfileVersion, portraitVersion: this.data.currentPortraitVersion }))
  },

  openSafetyScreening() { wx.navigateTo({ url: '/pages/safety-screening/safety-screening' }) },

  retryGeneration() {
    const requestId = this.data.generationRequestId || trainingPlanService.createRequestId()
    this.setData({ generationRequestId: requestId })
    this.runGeneration(() => trainingPlanService.retryGeneration(requestId, { profileVersion: this.data.currentProfileVersion, portraitVersion: this.data.currentPortraitVersion }))
  },

  async deferAdjustment() {
    if (this.data.isRequesting) return
    this.setData({ isRequesting: true, errorMessage: '' })
    try {
      await trainingPlanService.deferGeneration(this.data.currentProfileVersion, 'adjustment')
      await this.loadPlanStatus()
    } catch (error) {
      wx.showToast({ title: error.message || '方案状态更新失败', icon: 'none' })
    } finally {
      this.setData({ isRequesting: false })
    }
  },

  async runGeneration(request) {
    if (this.data.isRequesting || this.data.viewState.isGenerating) return
    this.setData({ isRequesting: true, errorMessage: '' })
    try {
      const result = await request()
      const activePlan = result.activePlan || (result.plan && result.plan.status === PLAN_STATUS.ACTIVE ? result.plan : this.data.activePlan)
      const planView = buildPlanView(activePlan, this.data.currentGoal)
      this.setData({
        loadStatus: 'ready',
        viewState: buildViewState(result.planStatus, activePlan),
        activePlan,
        planView,
        expandedWeekNumber: planView && planView.weeks.length ? planView.currentWeekNumber : null,
        isExplanationOpen: false,
        generationRequestId: ''
      })
    } catch (error) {
      if (error.code === PLAN_ERROR_CODES.PLAN_GENERATOR_NOT_CONFIGURED) {
        this.setData({ loadStatus: 'ready', viewState: buildViewState(PLAN_STATUS.GENERATOR_NOT_CONFIGURED), generationRequestId: '' })
      } else {
        if (error.code !== PLAN_ERROR_CODES.NETWORK_ERROR) this.setData({ generationRequestId: '' })
        const message = error.message || '方案生成失败，请稍后重试'
        await this.loadPlanStatus()
        this.setData({ errorMessage: message })
        wx.showToast({ title: message, icon: 'none' })
      }
    } finally {
      this.setData({ isRequesting: false })
    }
  }
})

module.exports = { buildPlanView, buildViewState, formatShortDate }
