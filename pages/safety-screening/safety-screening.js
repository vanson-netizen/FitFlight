const portraitService = require('../../services/user-portrait-service')
const { SAFETY_QUESTIONS, SAFETY_STATUS_OPTIONS } = require('../../constants/safety-screening')
const { PORTRAIT_ERROR_CODES } = require('../../constants/user-portrait')
const { validateSafetyForm, buildSavedAnswers } = require('./safety-screening-helpers')

const FALLBACK_ROUTE = '/pages/my-portrait/my-portrait'

Page({
  data: { loading: true, saving: false, errorMessage: '', questions: SAFETY_QUESTIONS, options: SAFETY_STATUS_OPTIONS, answers: {}, safetyAcknowledged: false, portraitVersion: 0 },
  onLoad() { this.load() },
  async load() {
    this.setData({ loading: true, errorMessage: '' })
    try {
      const result = await portraitService.getPortrait()
      if (!result.portrait) throw new Error('请先完成身体档案和用户画像')
      const saved = result.portrait.safetyScreening || {}
      const answers = buildSavedAnswers(SAFETY_QUESTIONS, saved)
      this.setData({ loading: false, answers, safetyAcknowledged: saved.safetyAcknowledged === true, portraitVersion: result.portrait.portraitVersion })
    } catch (error) { this.setData({ loading: false, errorMessage: error.message || '安全信息读取失败' }) }
  },
  choose(event) { this.setData({ [`answers.${event.currentTarget.dataset.field}`]: event.detail.value }) },
  acknowledge(event) { this.setData({ safetyAcknowledged: event.detail.value.includes('acknowledged') }) },
  returnToPreviousPage() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ fail: () => wx.redirectTo({ url: FALLBACK_ROUTE }) })
      return
    }
    wx.redirectTo({ url: FALLBACK_ROUTE })
  },
  async refreshPortraitVersion() {
    try {
      const result = await portraitService.getPortrait()
      if (result.portrait && Number.isInteger(result.portrait.portraitVersion)) {
        this.setData({ portraitVersion: result.portrait.portraitVersion })
      }
    } catch (error) {
      // 保留当前输入；用户再次保存时仍会得到明确错误。
    }
  },
  async save() {
    if (this.data.saving) return
    const validationMessage = validateSafetyForm(SAFETY_QUESTIONS, this.data.answers, this.data.safetyAcknowledged)
    if (validationMessage) return wx.showToast({ title: validationMessage, icon: 'none' })
    this.setData({ saving: true })
    try {
      const result = await portraitService.saveSafetyScreening({ ...this.data.answers, safetyAcknowledged: this.data.safetyAcknowledged }, this.data.portraitVersion)
      this.setData({ portraitVersion: result.portraitVersion })
      const title = result.planEligibilityStatus === 'eligible' ? '安全信息已保存' : '信息已保存，暂不自动生成方案'
      wx.showModal({ title: '保存成功', content: `${title}。信息仅用于判断是否适合自动生成一般健康方案，医疗问题请咨询专业医生。`, showCancel: false, success: () => this.returnToPreviousPage() })
    } catch (error) {
      if (error.code === PORTRAIT_ERROR_CODES.PORTRAIT_VERSION_CONFLICT) await this.refreshPortraitVersion()
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' })
    } finally { this.setData({ saving: false }) }
  }
})
