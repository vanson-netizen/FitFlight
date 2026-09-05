// 仅用于培养页面布局验收。接入真实周期方案后删除本文件及 service 中的 preview 分支。
// 内容不是个性化训练、营养或医疗建议，不得传入 trainingPlan/userPortrait 云函数。
const { createEmptyDailyRecord } = require('../constants/today-plan')

const readyPlan = {
  planId: 'preview-plan',
  planVersion: 'preview-v1',
  date: '2026-08-31',
  cycle: { currentWeek: 1, totalWeeks: 4, dayOfWeek: 2, stageName: '页面布局预览' },
  plannedExercise: {
    isRestDay: false,
    suggestedTime: '按方便的时间安排',
    totalDurationMinutes: 30,
    intensity: '页面预览',
    summary: '以下为中性页面预览内容，不代表真实训练建议。',
    items: [
      { itemId: 'preview-warmup', title: '热身活动（页面预览内容）', durationMinutes: 5, sets: null, reps: null, description: '用于检查短标题和说明布局。' },
      { itemId: 'preview-main', title: '主要活动与较长名称换行检查（页面预览内容）', durationMinutes: 20, sets: 2, reps: null, description: '用于检查项目较多时的自然滚动。' },
      { itemId: 'preview-cooldown', title: '放松活动（页面预览内容）', durationMinutes: 5, sets: null, reps: null, description: '' }
    ]
  },
  nutrition: {
    estimatedTargetKcal: null,
    disclaimer: '页面预览内容不构成饮食、营养或医疗建议。',
    recommendedMeals: {
      breakfast: [{ itemId: 'preview-breakfast', title: '早餐推荐占位（页面预览内容）', description: '用于检查长名称自动换行。' }],
      lunch: [{ itemId: 'preview-lunch', title: '午餐推荐占位（页面预览内容）', description: '' }],
      dinner: [{ itemId: 'preview-dinner', title: '晚餐推荐占位（页面预览内容）', description: '' }]
    }
  },
  recommendedSleep: {
    bedtime: '22:30',
    wakeTime: '07:00',
    durationMinutes: 510,
    tips: ['作息提示占位（页面预览内容）', '具体安排以后续正式方案为准。']
  }
}

const readyDailyRecord = createEmptyDailyRecord(readyPlan.date)

const restPlan = {
  ...readyPlan,
  planId: 'preview-rest-plan',
  cycle: { ...readyPlan.cycle, dayOfWeek: 3 },
  plannedExercise: {
    isRestDay: true,
    suggestedTime: '',
    totalDurationMinutes: null,
    intensity: '',
    summary: '今天是方案中的休息日，以下仅用于休息态布局预览。',
    items: []
  }
}

module.exports = {
  ready: { plan: readyPlan, dailyRecord: readyDailyRecord },
  rest: { plan: restPlan, dailyRecord: createEmptyDailyRecord(restPlan.date) }
}
