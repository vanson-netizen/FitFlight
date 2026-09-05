const journalService = require('../../services/journal-service')

function presentNotebook(notebook) {
  return { ...notebook, updatedAtText: journalService.formatDateTime(notebook.updatedAt) }
}

Page({
  data: {
    pageStatus: 'loading',
    errorMessage: '',
    notebooks: [],
    editorVisible: false,
    editorMode: 'create',
    editorTitle: '',
    editorNotebook: null,
    editorError: '',
    isSubmitting: false
  },

  onShow() { this.loadNotebooks() },

  async loadNotebooks() {
    const loadId = (this.loadId || 0) + 1
    this.loadId = loadId
    this.setData({ pageStatus: 'loading', errorMessage: '' })
    try {
      const result = await journalService.listNotebooks()
      if (loadId !== this.loadId) return
      const notebooks = result.notebooks.map(presentNotebook)
      this.setData({ pageStatus: notebooks.length ? 'ready' : 'empty', notebooks })
    } catch (error) {
      if (loadId !== this.loadId) return
      this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取日志本' })
    }
  },

  retryLoad() { this.loadNotebooks() },

  openCreate() {
    this.createRequestId = journalService.createRequestId()
    this.setData({ editorVisible: true, editorMode: 'create', editorTitle: '', editorNotebook: null, editorError: '' })
  },

  openRename(event) {
    const notebook = this.data.notebooks.find((item) => item._id === event.currentTarget.dataset.id)
    if (!notebook) return
    this.setData({ editorVisible: true, editorMode: 'rename', editorTitle: notebook.title, editorNotebook: notebook, editorError: '' })
  },

  closeEditor() {
    if (this.data.isSubmitting) return
    this.createRequestId = null
    this.setData({ editorVisible: false, editorError: '' })
  },

  noop() {},

  updateEditorTitle(event) { this.setData({ editorTitle: event.detail.value, editorError: '' }) },

  async submitEditor() {
    if (this.data.isSubmitting) return
    const title = this.data.editorTitle.trim()
    if (!title || Array.from(title).length > 30) {
      this.setData({ editorError: '日志本名称需为1–30个字符' })
      return
    }
    this.setData({ isSubmitting: true, editorError: '' })
    try {
      if (this.data.editorMode === 'create') {
        await journalService.createNotebook(title, this.createRequestId)
      } else {
        const notebook = this.data.editorNotebook
        await journalService.renameNotebook(notebook._id, title, notebook.version)
      }
      this.createRequestId = null
      this.setData({ isSubmitting: false, editorVisible: false })
      wx.showToast({ title: this.data.editorMode === 'create' ? '日志本已创建' : '名称已更新', icon: 'success' })
      this.loadNotebooks()
    } catch (error) {
      this.setData({ isSubmitting: false, editorError: error.message || '保存失败，请稍后重试' })
    }
  },

  openNotebook(event) {
    const notebook = this.data.notebooks.find((item) => item._id === event.currentTarget.dataset.id)
    if (!notebook) return
    wx.navigateTo({ url: `/pages/journal-entries/journal-entries?notebookId=${notebook._id}&title=${encodeURIComponent(notebook.title)}` })
  }
})

module.exports.presentNotebook = presentNotebook
