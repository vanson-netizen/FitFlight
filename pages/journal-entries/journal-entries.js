const journalService = require('../../services/journal-service')
const journalDraft = require('../../utils/journal-draft')

function presentEntry(entry) {
  return {
    ...entry,
    displayTitle: journalService.entryDisplayTitle(entry),
    summary: entry.content.replace(/\s+/g, ' ').trim(),
    updatedAtText: journalService.formatDateTime(entry.updatedAt)
  }
}

Page({
  data: { pageStatus: 'loading', errorMessage: '', notebookId: '', notebookTitle: '', entries: [] },

  onLoad(options) {
    this.setData({ notebookId: options.notebookId || '', notebookTitle: decodeURIComponent(options.title || '日志本') })
  },

  onShow() { this.loadEntries() },

  async loadEntries() {
    if (!this.data.notebookId) {
      this.setData({ pageStatus: 'error', errorMessage: '日志本参数无效' })
      return
    }
    const loadId = (this.loadId || 0) + 1
    this.loadId = loadId
    this.setData({ pageStatus: 'loading', errorMessage: '' })
    try {
      const result = await journalService.listEntries(this.data.notebookId)
      if (loadId !== this.loadId) return
      const entries = result.entries.map(presentEntry)
      this.setData({ pageStatus: entries.length ? 'ready' : 'empty', entries, notebookTitle: result.notebook.title })
    } catch (error) {
      if (loadId !== this.loadId) return
      this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取日志' })
    }
  },

  retryLoad() { this.loadEntries() },

  createEntry() {
    const draftId = journalDraft.createDraftId()
    wx.navigateTo({ url: `/pages/journal-editor/journal-editor?notebookId=${this.data.notebookId}&draftId=${draftId}&notebookTitle=${encodeURIComponent(this.data.notebookTitle)}` })
  },

  openEntry(event) {
    const entryId = event.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/journal-editor/journal-editor?notebookId=${this.data.notebookId}&entryId=${entryId}&notebookTitle=${encodeURIComponent(this.data.notebookTitle)}` })
  }
})

module.exports.presentEntry = presentEntry
