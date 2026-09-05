const healthRecordService = require('../../services/health-record-service')
const { ENERGY_LEVELS, BODY_FEELINGS } = require('../../constants/health-record')
const { beijingDateKey } = require('../../utils/beijing-date')

const emptyForm = (recordDate) => ({ recordDate, weightKg: '', sleepHours: '', energyLevel: '', bodyFeeling: '', note: '', version: 0 })
Page({
  data: { pageStatus: 'loading', errorMessage: '', saveError: '', isSaving: false, today: beijingDateKey(), form: emptyForm(beijingDateKey()), energyLevels: ENERGY_LEVELS, bodyFeelings: BODY_FEELINGS },
  onLoad(options = {}) { this.initialDate = options.recordDate || beijingDateKey(); this.setData({ form: emptyForm(this.initialDate) }) },
  onShow() { if (!this.initialized) this.loadRecord(this.data.form.recordDate) },
  async loadRecord(recordDate) {
    const id = (this.loadId || 0) + 1; this.loadId = id; this.setData({ pageStatus: 'loading', errorMessage: '', saveError: '' })
    try {
      const result = await healthRecordService.getRecord(recordDate)
      if (id !== this.loadId) return
      const record = result.record
      this.initialized = true
      this.setData({ pageStatus: record ? 'ready' : 'empty', form: record ? { ...record, weightKg: record.weightKg === null ? '' : String(record.weightKg), sleepHours: record.sleepHours === null ? '' : String(record.sleepHours), energyLevel: record.energyLevel || '', bodyFeeling: record.bodyFeeling || '', note: record.note || '' } : emptyForm(recordDate) })
    } catch (error) { if (id === this.loadId) this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取记录' }) }
  },
  retryLoad() { this.loadRecord(this.data.form.recordDate) },
  changeDate(event) { this.initialized = false; this.loadRecord(event.detail.value) },
  changeNumber(event) { this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value, saveError: '' }) },
  chooseEnergy(event) { this.setData({ 'form.energyLevel': event.currentTarget.dataset.value, saveError: '' }) },
  chooseFeeling(event) { this.setData({ 'form.bodyFeeling': event.currentTarget.dataset.value, saveError: '' }) },
  changeNote(event) { this.setData({ 'form.note': event.detail.value, saveError: '' }) },
  async save() {
    if (this.data.isSaving) return
    const form = this.data.form
    const weightKg = form.weightKg === '' ? null : Number(form.weightKg)
    const sleepHours = form.sleepHours === '' ? null : Number(form.sleepHours)
    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400)) return this.setData({ saveError: '体重需为20–400kg' })
    if (sleepHours !== null && (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24)) return this.setData({ saveError: '睡眠时长需为0–24小时' })
    if ([weightKg, sleepHours, form.energyLevel || null, form.bodyFeeling || null].every((value) => value === null)) return this.setData({ saveError: '请至少填写一项健康指标' })
    this.setData({ isSaving: true, saveError: '' })
    try {
      await healthRecordService.saveRecord({ ...form, weightKg, sleepHours })
      this.setData({ isSaving: false }); wx.showToast({ title: '记录已保存', icon: 'success' }); wx.navigateBack()
    } catch (error) { this.setData({ isSaving: false, saveError: error.code === 'VERSION_CONFLICT' ? '记录已在其他设备更新，当前输入已保留，请重新加载后再保存' : error.message || '保存失败，请稍后重试' }) }
  }
})
module.exports.emptyForm = emptyForm
