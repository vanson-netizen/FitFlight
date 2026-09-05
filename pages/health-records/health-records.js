const healthRecordService = require('../../services/health-record-service')
const trainingPlanService = require('../../services/training-plan-service')
const { ENERGY_LEVELS, BODY_FEELINGS } = require('../../constants/health-record')
const { evaluateHealthPrompts } = require('../../utils/health-trend')

const labelOf = (options, value) => (options.find((item) => item.value === value) || {}).label || ''
function presentRecord(record) {
  return { ...record, weightText: record.weightKg === null ? '' : `${record.weightKg} kg`, sleepText: record.sleepHours === null ? '' : `${record.sleepHours} 小时`, energyText: labelOf(ENERGY_LEVELS, record.energyLevel), feelingText: labelOf(BODY_FEELINGS, record.bodyFeeling) }
}
function planSnapshot(result) {
  const plan = result && (result.activePlan || result.plan)
  return plan && plan.content && plan.content.profileSnapshot ? plan.content.profileSnapshot : null
}

Page({
  data: { pageStatus: 'loading', errorMessage: '', records: [], latest: null, prompts: [], shouldOfferProfileUpdate: false, latestWeightKg: null },
  onShow() { this.load() },
  async load() {
    const id = (this.loadId || 0) + 1; this.loadId = id; this.setData({ pageStatus: 'loading', errorMessage: '' })
    try {
      const [recordResult, planResult] = await Promise.all([healthRecordService.listRecords(), trainingPlanService.getActivePlan().catch(() => null)])
      if (id !== this.loadId) return
      const records = recordResult.records.map(presentRecord)
      const evaluation = evaluateHealthPrompts(recordResult.records, planSnapshot(planResult))
      this.setData({ pageStatus: records.length ? 'ready' : 'empty', records, latest: records[0] || null, prompts: evaluation.prompts, shouldOfferProfileUpdate: evaluation.shouldOfferProfileUpdate, latestWeightKg: evaluation.latestWeightKg })
    } catch (error) { if (id === this.loadId) this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取健康记录' }) }
  },
  retryLoad() { this.load() },
  addRecord() { wx.navigateTo({ url: '/pages/health-record-editor/health-record-editor' }) },
  editRecord(event) { wx.navigateTo({ url: `/pages/health-record-editor/health-record-editor?recordDate=${event.currentTarget.dataset.date}` }) },
  openTrends() { wx.navigateTo({ url: '/pages/health-trends/health-trends' }) },
  offerProfileUpdate() {
    if (!this.data.shouldOfferProfileUpdate) return
    wx.showModal({ title: '更新身体档案？', content: '只会预填最新体重，仍需你确认并保存。健康记录本身不会修改画像或方案。', confirmText: '前往更新', success: ({ confirm }) => { if (confirm) wx.navigateTo({ url: `/pages/body-profile/body-profile?prefillWeightKg=${this.data.latestWeightKg}` }) } })
  }
})
module.exports.presentRecord = presentRecord
module.exports.planSnapshot = planSnapshot
