const { MAX_NOTEBOOKS, notebookDocumentId, entryDocumentId, publicNotebook, publicEntry } = require('./journal-core')

function failure(code, message) { return { ok: false, code, message } }

function createOperations(repository, now) {
  async function listNotebooks(openid) {
    const records = await repository.listNotebooks(openid)
    return { ok: true, notebooks: records.map(publicNotebook) }
  }

  async function createNotebook(openid, input) {
    const id = notebookDocumentId(openid, input.requestId)
    const timestamp = now()
    const result = await repository.createNotebookAtomic(openid, id, {
      _openid: openid,
      title: input.title,
      entryCount: 0,
      version: 1,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    }, MAX_NOTEBOOKS)
    if (result.limitExceeded) return failure('LIMIT_EXCEEDED', `每位用户最多创建${MAX_NOTEBOOKS}个日志本`)
    return { ok: true, notebook: publicNotebook(result.record), idempotent: result.idempotent === true }
  }

  async function renameNotebook(openid, input) {
    const timestamp = now()
    const result = await repository.renameNotebookAtomic(openid, input.notebookId, input.version, { title: input.title, updatedAt: timestamp })
    if (!result.found) return failure('NOTEBOOK_NOT_FOUND', '未找到当前用户的日志本')
    if (result.versionConflict) return failure('VERSION_CONFLICT', '日志本已在其他页面更新，请重新加载')
    return { ok: true, notebook: publicNotebook(result.record) }
  }

  async function listEntries(openid, input) {
    const notebook = await repository.getNotebook(openid, input.notebookId)
    if (!notebook || notebook.status !== 'active') return failure('NOTEBOOK_NOT_FOUND', '未找到当前用户的日志本')
    const records = await repository.listEntries(openid, input.notebookId)
    return { ok: true, notebook: publicNotebook(notebook), entries: records.map(publicEntry) }
  }

  async function getEntry(openid, input) {
    const notebook = await repository.getNotebook(openid, input.notebookId)
    if (!notebook || notebook.status !== 'active') return failure('NOTEBOOK_NOT_FOUND', '未找到当前用户的日志本')
    const entry = await repository.getEntry(openid, input.entryId)
    if (!entry || entry.notebookId !== input.notebookId) return failure('ENTRY_NOT_FOUND', '未找到当前用户的日志')
    return { ok: true, notebook: publicNotebook(notebook), entry: publicEntry(entry) }
  }

  async function saveEntry(openid, input) {
    const timestamp = now()
    if (!input.entryId) {
      const id = entryDocumentId(openid, input.notebookId, input.requestId)
      const result = await repository.createEntryAtomic(openid, input.notebookId, id, {
        _openid: openid,
        notebookId: input.notebookId,
        title: input.title,
        content: input.content,
        version: 1,
        lastRequestId: input.requestId,
        createdAt: timestamp,
        updatedAt: timestamp
      }, timestamp)
      if (!result.notebookFound) return failure('NOTEBOOK_NOT_FOUND', '未找到当前用户的日志本')
      return { ok: true, entry: publicEntry(result.record), idempotent: result.idempotent === true }
    }

    const result = await repository.updateEntryAtomic(openid, input.notebookId, input.entryId, input.version, input.requestId, {
      title: input.title,
      content: input.content,
      updatedAt: timestamp
    }, timestamp)
    if (!result.notebookFound) return failure('NOTEBOOK_NOT_FOUND', '未找到当前用户的日志本')
    if (!result.entryFound) return failure('ENTRY_NOT_FOUND', '未找到当前用户的日志')
    if (result.versionConflict) return failure('VERSION_CONFLICT', '日志已在其他页面更新，本地输入未被覆盖')
    return { ok: true, entry: publicEntry(result.record), idempotent: result.idempotent === true }
  }

  return { listNotebooks, createNotebook, renameNotebook, listEntries, getEntry, saveEntry }
}

module.exports = { createOperations, failure }
