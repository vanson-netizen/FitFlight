const { TODAY_PLAN_PAGE_STATUS, buildTodayPlanDisplayModel } = require('../constants/today-plan')
const previewScenarios = require('../preview/today-plan-preview')
const trainingPlanService = require('./training-plan-service')

// 开发调试开关，正式用户界面不可见。可临时改为 ready、rest 或 error 验收布局；默认必须为空。
const ACTIVE_PREVIEW_SCENARIO = ''

async function getTodayPlanDisplayModel(date) {
  if (ACTIVE_PREVIEW_SCENARIO === 'error') throw new Error('页面预览错误状态')
  const preview = previewScenarios[ACTIVE_PREVIEW_SCENARIO]
  if (!preview) {
    const result = await trainingPlanService.getActivePlan()
    if (result.planStatus === 'generating') return { status: TODAY_PLAN_PAGE_STATUS.GENERATING, displayModel: null }
    if (result.planStatus === 'archived') return { status: TODAY_PLAN_PAGE_STATUS.ARCHIVED, displayModel: null }
    if (result.planStatus === 'safety_paused') return { status: TODAY_PLAN_PAGE_STATUS.SAFETY_BLOCKED, displayModel: null }
    if (['outdated', 'pending_confirmation', 'generation_failed'].includes(result.planStatus)) return { status: TODAY_PLAN_PAGE_STATUS.OUTDATED, displayModel: null }
    const content = result.activePlan && result.activePlan.content
    const plan = content && Array.isArray(content.dailyPlans) ? content.dailyPlans.find((item) => item.date === date) : null
    if (!result.activePlan) return { status: TODAY_PLAN_PAGE_STATUS.EMPTY, displayModel: null, emptyKind: 'no_plan' }
    if (!plan) return { status: TODAY_PLAN_PAGE_STATUS.EMPTY, displayModel: null, emptyKind: 'no_day_plan' }
    const displayModel = buildTodayPlanDisplayModel({ ...plan, goal: content.summary && content.summary.goal, planId: result.activePlan.planId, planVersion: result.activePlan.generatorVersion, ruleReviewStatus: content.ruleReviewStatus || '', planDisclaimer: content.disclaimer || '' }, null)
    return { status: displayModel.plannedExercise.isRestDay ? TODAY_PLAN_PAGE_STATUS.REST : TODAY_PLAN_PAGE_STATUS.READY, displayModel }
  }

  const plan = { ...preview.plan, date: date || preview.plan.date }
  const dailyRecord = { ...preview.dailyRecord, date: plan.date }
  const displayModel = buildTodayPlanDisplayModel(plan, dailyRecord)
  return {
    status: displayModel.plannedExercise.isRestDay ? TODAY_PLAN_PAGE_STATUS.REST : TODAY_PLAN_PAGE_STATUS.READY,
    displayModel
  }
}

module.exports = { getTodayPlanDisplayModel }
