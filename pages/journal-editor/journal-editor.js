const journalService = require('../../services/journal-service')
const { safeNavigateBack } = require('../../utils/navigation')
const journalDraft = require('../../utils/journal-draft')

function codePointLength(value) { return Array.from(value || '').length }
function sameForm(left, right) { return left.title === right.title && left.content === right.content }

Page({
  data: {
    pageStatus: 'loading',
    errorMessage: '',
    saveError: '',
    notebookId: '',
    notebookTitle: '',
    entryId: '',
    draftId: '',
    version: 0,
    form: { title: '', content: '' },
    contentLength: 0,
    dirty: false,
    isSaving: false,
    hasVersionConflict: false
  },

  onLoad(options) {
    const entryId = options.entryId || ''
    const draftId = options.draftId || (entryId ? '' : journalDraft.createDraftId())
    this.draftStorageId = entryId || draftId
    this.baseline = { title: '', content: '' }
    this.setData({ notebookId: options.notebookId || '', notebookTitle: decodeURIComponent(options.notebookTitle || '日志本'), entryId, draftId })
  },

  onShow() {
    if (!this.initialized) this.loadEditor()
  },

  async loadEditor() {
    if (!this.data.notebookId || (!this.data.entryId && !this.data.draftId)) {
      this.setData({ pageStatus: 'error', errorMessage: '日志参数无效' })
      return
    }
    const loadId = (this.loadId || 0) + 1
    this.loadId = loadId
    this.setData({ pageStatus: 'loading', errorMessage: '', saveError: '', hasVersionConflict: false })
    try {
      let base = { title: '', content: '' }
      let version = 0
      if (this.data.entryId) {
        const result = await journalService.getEntry(this.data.notebookId, this.data.entryId)
        if (loadId !== this.loadId) return
        base = { title: result.entry.title || '', content: result.entry.content || '' }
        version = result.entry.version
      }
      this.baseline = base
      this.initialized = true
      this.setData({ pageStatus: this.data.entryId ? 'ready' : 'empty', version, form: base, contentLength: codePointLength(base.content), dirty: false })
      await this.offerDraftRestore(base)
    } catch (error) {
      if (loadId !== this.loadId) return
      this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取日志' })
    }
  },

  retryLoad() { this.loadEditor() },

  offerDraftRestore(base) {
    const draft = journalDraft.readDraft(this.data.notebookId, this.draftStorageId)
    if (!draft || sameForm(draft, base)) return Promise.resolve()
    return new Promise((resolve) => {
      wx.showModal({
        title: '发现未保存草稿',
        content: '是否恢复上次未保存的内容？',
        confirmText: '恢复草稿',
        cancelText: '暂不恢复',
        success: ({ confirm }) => {
          if (confirm) {
            const form = { title: draft.title || '', content: draft.content || '' }
            this.setData({ form, contentLength: codePointLength(form.content), dirty: !sameForm(form, this.baseline) })
            this.syncUnloadAlert()
          } else {
            journalDraft.clearDraft(this.data.notebookId, this.draftStorageId)
          }
          resolve()
        },
        fail: resolve
      })
    })
  },

  updateTitle(event) { this.updateForm({ title: event.detail.value }) },
  updateContent(event) { this.updateForm({ content: event.detail.value }) },

  updateForm(changes) {
    const form = { ...this.data.form, ...changes }
    const dirty = !sameForm(form, this.baseline)
    this.saveRequestId = null
    this.setData({ form, contentLength: codePointLength(form.content), dirty, saveError: '', hasVersionConflict: false })
    if (dirty) journalDraft.saveDraft(this.data.notebookId, this.draftStorageId, { ...form, baseVersion: this.data.version })
    else journalDraft.clearDraft(this.data.notebookId, this.draftStorageId)
    this.syncUnloadAlert()
  },

  syncUnloadAlert() {
    if (this.data.dirty && wx.enableAlertBeforeUnload) wx.enableAlertBeforeUnload({ message: '日志尚未保存，确定放弃修改吗？' })
    if (!this.data.dirty && wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload()
  },

  async save() {
    if (this.data.isSaving) return
    const title = this.data.form.title.trim()
    const content = this.data.form.content
    if (codePointLength(title) > 50) return this.setData({ saveError: '日志标题最多50个字符' })
    if (!content.trim() || codePointLength(content) > 5000) return this.setData({ saveError: '日志正文需为1–5000个字符' })
    if (!this.saveRequestId) this.saveRequestId = journalService.createRequestId()
    this.setData({ isSaving: true, saveError: '', hasVersionConflict: false })
    try {
      await journalService.saveEntry({ notebookId: this.data.notebookId, entryId: this.data.entryId, title, content, version: this.data.version, requestId: this.saveRequestId })
      journalDraft.clearDraft(this.data.notebookId, this.draftStorageId)
      this.baseline = { title, content }
      this.saveRequestId = null
      this.setData({ isSaving: false, dirty: false })
      if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload()
      wx.showToast({ title: '日志已保存', icon: 'success' })
      safeNavigateBack()
    } catch (error) {
      this.setData({ isSaving: false, saveError: error.message || '保存失败，请稍后重试', hasVersionConflict: error.code === 'VERSION_CONFLICT' })
    }
  },

  reloadAfterConflict() {
    wx.showModal({
      title: '重新加载云端内容？',
      content: '重新加载将放弃当前输入并显示云端最新版本。也可以取消后选择另存为新日志。',
      confirmText: '重新加载',
      success: ({ confirm }) => {
        if (!confirm) return
        this.initialized = false
        this.saveRequestId = null
        journalDraft.clearDraft(this.data.notebookId, this.draftStorageId)
        if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload()
        this.loadEditor()
      }
    })
  },

  saveAsNew() {
    this.saveRequestId = journalService.createRequestId()
    this.setData({ entryId: '', version: 0, hasVersionConflict: false, saveError: '' }, () => this.save())
  },

  handleBack() {
    if (!this.data.dirty) return safeNavigateBack()
    wx.showModal({
      title: '日志尚未保存',
      content: '要继续编辑，还是放弃本次修改？',
      cancelText: '继续编辑',
      confirmText: '放弃修改',
      success: ({ confirm }) => {
        if (!confirm) return
        journalDraft.clearDraft(this.data.notebookId, this.draftStorageId)
        if (wx.disableAlertBeforeUnload) wx.disableAlertBeforeUnload()
        safeNavigateBack()
      }
    })
  }
})

module.exports.codePointLength = codePointLength
module.exports.sameForm = sameForm
