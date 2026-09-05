const PREFIX = 'fitflight:journal-draft:v1'

function draftStorageKey(notebookId, entryOrDraftId) {
  return `${PREFIX}:${notebookId}:${entryOrDraftId}`
}

function saveDraft(notebookId, entryOrDraftId, draft) {
  const value = { title: String(draft.title || ''), content: String(draft.content || ''), baseVersion: Number(draft.baseVersion) || 0, savedAt: Date.now() }
  wx.setStorageSync(draftStorageKey(notebookId, entryOrDraftId), value)
  return value
}

function readDraft(notebookId, entryOrDraftId) {
  const value = wx.getStorageSync(draftStorageKey(notebookId, entryOrDraftId))
  return value && typeof value === 'object' ? value : null
}

function clearDraft(notebookId, entryOrDraftId) {
  wx.removeStorageSync(draftStorageKey(notebookId, entryOrDraftId))
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

module.exports = { PREFIX, draftStorageKey, saveDraft, readDraft, clearDraft, createDraftId }
