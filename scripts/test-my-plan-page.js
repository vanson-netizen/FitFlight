const assert = require('assert')
const fs = require('fs')

let pageDefinition
global.Page = (definition) => { pageDefinition = definition }
global.wx = { cloud: {}, showToast: () => {}, navigateTo: () => {} }

const { buildPlanView, buildViewState } = require('../pages/my-plan/my-plan')

function pageFrom(definition, data = {}) {
  return {
    ...definition,
    data: { ...definition.data, ...data },
    setData(update) { this.data = { ...this.data, ...update } }
  }
}

function buildSnapshot() {
  const weeks = [4, 2, 1, 3].map((weekNumber) => ({
    weekNumber,
    stage: `stage-${weekNumber}`,
    stageName: `阶段 ${weekNumber}`,
    startDate: `2026-09-${String((weekNumber - 1) * 7 + 1).padStart(2, '0')}`,
    endDate: `2026-09-${String(weekNumber * 7).padStart(2, '0')}`,
    plannedTrainingDays: 3,
    expectedSessionDurationMinutes: 30,
    intensityRange: '轻到中等强度',
    focus: [`第 ${weekNumber} 周重点`],
    trainingStructure: ['基础训练'],
    nutritionFocus: ['规律三餐'],
    sleepFocus: ['保持规律作息']
  }))
  const dailyPlans = Array.from({ length: 28 }, (_, index) => {
    const weekIndex = Math.floor(index / 7) + 1
    const day = index + 1
    return {
      date: `2026-09-${String(day).padStart(2, '0')}`,
      weekIndex,
      dayType: index % 3 === 0 ? 'training' : 'light_activity',
      title: index % 3 === 0 ? '训练日' : '轻活动日',
      exercise: { totalDurationMinutes: index % 3 === 0 ? 30 : 20 },
      nutrition: { recommendedMeals: {
        breakfast: [{ title: '规律早餐' }],
        lunch: [{ title: '均衡午餐' }],
        dinner: [{ title: '规律晚餐' }]
      } }
    }
  })
  return {
    planId: 'plan-1',
    profileVersion: 3,
    portraitVersion: 7,
    ruleVersion: 'fitflight-cultivation-v1-draft.2',
    generatedAt: '2026-09-01T00:00:00.000Z',
    content: {
      ruleReviewStatus: 'product_draft',
      resourceDataVersion: 'buaa-resource-pending.1',
      disclaimer: '一般健康管理参考。',
      summary: {
        planName: '力量与恢复培养',
        goal: 'muscle_gain',
        startDate: '2026-09-01',
        endDate: '2026-09-28',
        trainingDaysPerWeek: 3,
        expectedSessionDurationMinutes: 30,
        trainingPrinciples: ['基础抗阻优先'],
        nutritionPrinciples: ['规律三餐'],
        sleepPrinciples: ['保持规律作息'],
        safetyNotices: ['不适时停止'],
        reviewDate: '2026-09-28'
      },
      cycle: { weeks },
      dailyPlans
    }
  }
}

const view = buildPlanView(buildSnapshot(), 'fat_loss', new Date(2026, 8, 10))
assert.strictEqual(view.goal, 'muscle_gain', '方案目标必须来自快照')
assert.strictEqual(view.goalLabel, '增肌')
assert.strictEqual(view.goalChanged, true)
assert.deepStrictEqual(view.weeks.map((week) => week.weekNumber), [1, 2, 3, 4], '四周卡片应按周次排序')
assert.strictEqual(view.currentWeekNumber, 2)
assert.strictEqual(view.weeks.filter((week) => week.isCurrent).length, 1)
assert.strictEqual(view.weeks[1].daySummaries.length, 2, '周详情只展示训练日简表')
assert.strictEqual(view.weeks[1].progressionFocus, '第 2 周重点')
assert.ok(view.lifestylePrinciples.some((item) => item.includes('饮水')), '旧方案生活策略应兼容补充饮水')

const legacy = buildPlanView({ profileVersion: 1, content: { summary: { goal: 'maintain' }, cycle: { weeks: [{ weekNumber: 1 }] } } }, '', new Date(2026, 8, 1))
assert.strictEqual(legacy.weeks[0].stageLabel, '阶段待确认')
assert.strictEqual(legacy.weeks[0].dateRange, '日期待确认')
assert.strictEqual(legacy.weeks[0].focusText, '本周重点暂未写入旧方案快照')
assert.strictEqual(legacy.weeks[0].daySummaries.length, 0)
assert.ok(!JSON.stringify(legacy).includes('undefined'))
assert.ok(!JSON.stringify(legacy).includes('null'))

const genericOldPlan = buildSnapshot()
assert.strictEqual(buildPlanView(genericOldPlan, 'muscle_gain', new Date(2026, 8, 1)).isLegacy, true, '只有笼统训练项的旧快照必须提供重新生成路径')

assert.strictEqual(buildViewState('active').isActive, true)
assert.strictEqual(buildViewState('outdated', buildSnapshot()).isOutdated, true)
assert.strictEqual(buildViewState('generating', buildSnapshot()).isGenerating, true)
assert.strictEqual(buildViewState('generation_failed').isFailed, true)
assert.strictEqual(buildViewState('generator_not_configured').isNotConfigured, true)
assert.strictEqual(buildViewState('none').isNone, true)

const page = pageFrom(pageDefinition, { expandedWeekNumber: 2 })
page.toggleWeek({ currentTarget: { dataset: { week: 2 } } })
assert.strictEqual(page.data.expandedWeekNumber, null, '再次点击应收起')
page.toggleWeek({ currentTarget: { dataset: { week: 1 } } })
assert.strictEqual(page.data.expandedWeekNumber, 1)
page.toggleWeek({ currentTarget: { dataset: { week: 4 } } })
assert.strictEqual(page.data.expandedWeekNumber, 4, '打开另一周应替换展开项')
page.openExplanation()
assert.strictEqual(page.data.isExplanationOpen, true)
page.closeExplanation()
assert.strictEqual(page.data.isExplanationOpen, false)

const wxml = fs.readFileSync('pages/my-plan/my-plan.wxml', 'utf8')
assert.ok(wxml.includes('bindtap="toggleWeek"'))
assert.ok(wxml.includes('bindtap="openExplanation"'))
assert.ok(wxml.includes('生活策略'))
assert.ok(!wxml.includes('mealStructure'), '周卡片不应重复展示三餐结构')
assert.ok(!/热身动作|每组次数|完成按钮|打卡状态/.test(wxml), '我的方案不应重复每日执行或打卡内容')

console.log('My plan page checks passed.')
