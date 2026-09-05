const RULE_CONFIG = Object.freeze({
  ruleVersion: 'fitflight-training-prescription-v1-draft.1',
  ruleReviewStatus: 'product_draft',
  generatorVersion: 'fitflight-executable-training-v1-draft.1',
  schemaVersion: '1.2.0-draft',
  safetyScreeningVersion: 'safety-screening-v1',
  population: { minimumAgeYears: 18, maximumAgeYears: 64 },
  cycle: {
    totalWeeks: 4,
    daysPerWeek: 7,
    minimumRecoveryDaysPerWeek: 1,
    minimumLightActivityDaysPerWeek: 1,
    maximumStructuredTrainingDaysPerWeek: 6,
    maximumConsecutiveTrainingDays: 2,
    sessionSections: ['preparation', 'main', 'cooldown'],
    sectionRatios: { preparation: 0.2, main: 0.6, cooldown: 0.2 },
    stages: [
      { key: 'adaptation', name: '建立规律和动作适应', focus: '建立可完成的训练、轻活动与恢复节奏' },
      { key: 'stable_completion', name: '稳定完成', focus: '复现可完成结构，保持时长、频率和强度' },
      { key: 'controlled_progression', name: '明确边界内递进', focus: '只应用模板声明的一项组数、次数或时长递进，总时长保持不变' },
      { key: 'consolidation_review', name: '巩固、恢复和复盘', focus: '巩固规律、保留恢复并回顾执行感受' }
    ]
  },
  sourceIds: ['cn-dietary-guidelines-2022', 'national-fitness-guide-2017', 'healthy-china-action-2019-2030', 'weight-management-principles-2024'],
  catalogVersions: { exerciseCatalog: 'exercise-catalog-draft.1', mealPatternCatalog: 'meal-pattern-draft.1' },
  goalPolicies: {
    fat_loss: { name: '减脂习惯培养', training: ['有氧基础', '基础抗阻维持', '灵活性与规律'], lifestyle: ['保证蛋白质食物和蔬菜，主食适量；减少油炸食品及含糖饮料', '分次、规律饮水，约 6—8 杯并按个人情况调整', '尽量保证 7 小时以上睡眠并安排恢复'], diet: ['保证蛋白质食物和蔬菜，主食适量', '减少油炸食品及含糖饮料'], dailyDietTasks: ['至少一餐包含蛋白质食物', '至少吃一份蔬菜，少选油炸食品或含糖饮料'], sleep: ['尽量保证 7 小时以上睡眠并安排恢复'], review: '回顾规律完成情况、体感和可持续性' },
    muscle_gain: { name: '力量与恢复培养', training: ['基础抗阻优先', '有氧维持', '灵活性与恢复'], lifestyle: ['保持三餐，训练前后增加一份主食或蛋白质食物', '分次、规律饮水，约 6—8 杯并按个人情况调整', '尽量保证 7 小时以上睡眠并安排恢复'], diet: ['保持三餐，训练前后增加一份主食或蛋白质食物'], dailyDietTasks: ['三餐中安排蛋白质食物', '训练前后增加一份主食或蛋白质食物'], dailyRestDietTasks: ['三餐中安排蛋白质食物', '保持三餐，不因休息日跳餐'], sleep: ['尽量保证 7 小时以上睡眠并安排恢复'], review: '回顾动作完成、恢复感受和规律性' },
    weight_gain: { name: '健康增重习惯培养', training: ['保守抗阻', '轻量有氧', '灵活性与恢复'], lifestyle: ['保持三餐，训练前后增加一份主食或蛋白质食物', '分次、规律饮水，约 6—8 杯并按个人情况调整', '尽量保证 7 小时以上睡眠并安排恢复'], diet: ['保持三餐，训练前后增加一份主食或蛋白质食物'], dailyDietTasks: ['按时完成三餐', '增加一份主食或蛋白质食物'], sleep: ['尽量保证 7 小时以上睡眠并安排恢复'], review: '回顾进餐规律、训练体感和恢复情况' },
    maintain: { name: '状态保持培养', training: ['有氧、力量与灵活性均衡', '维持可执行水平'], lifestyle: ['保持三餐结构，避免连续多餐过量', '分次、规律饮水，约 6—8 杯并按个人情况调整', '尽量保证 7 小时以上睡眠并安排恢复'], diet: ['保持三餐结构，避免连续多餐过量'], dailyDietTasks: ['保持三餐结构', '今天避免连续多餐过量'], sleep: ['尽量保证 7 小时以上睡眠并安排恢复'], review: '回顾习惯稳定性与中断原因' },
    fitness_improvement: { name: '综合体能培养', training: ['有氧基础', '基础力量', '灵活性与规律'], lifestyle: ['训练前避免空腹过久，训练后补充正常正餐', '分次、规律饮水，训练前后适量补水', '尽量保证 7 小时以上睡眠并安排恢复'], diet: ['训练前避免空腹过久，训练后补充正常正餐'], dailyDietTasks: ['训练前避免空腹过久', '训练后补充正常正餐'], dailyRestDietTasks: ['保持三餐结构', '至少一餐包含蔬菜和蛋白质食物'], sleep: ['尽量保证 7 小时以上睡眠并安排恢复'], review: '回顾综合活动能力、体感和规律性' }
  },
  stopNotice: '出现疼痛、胸闷、明显气促、眩晕、损伤或医生要求停止时，请终止当天任务并寻求专业帮助。',
  disclaimer: '本方案为开发阶段的一般健康管理建议，不是医疗建议。医疗、康复或特殊身体问题请咨询专业人员。'
})

module.exports = { RULE_CONFIG }
