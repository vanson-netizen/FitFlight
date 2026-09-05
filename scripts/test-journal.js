const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { validateRequest, notebookDocumentId, entryDocumentId } = require('../cloudfunctions/journal/journal-core')
const { createOperations } = require('../cloudfunctions/journal/journal-operations')

class MemoryRepository {
  constructor() { this.notebooks = new Map(); this.entries = new Map() }
  async listNotebooks(openid) { return Array.from(this.notebooks.values()).filter((item) => item._openid === openid && item.status === 'active').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) }
  async getNotebook(openid, id) { const item = this.notebooks.get(id); return item && item._openid === openid ? item : null }
  async listEntries(openid, notebookId) { return Array.from(this.entries.values()).filter((item) => item._openid === openid && item.notebookId === notebookId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) }
  async getEntry(openid, id) { const item = this.entries.get(id); return item && item._openid === openid ? item : null }
  async createNotebookAtomic(openid, id, data, limit) {
    const existing = await this.getNotebook(openid, id)
    if (existing) return { record: existing, idempotent: true }
    if ((await this.listNotebooks(openid)).length >= limit) return { limitExceeded: true }
    const record = { _id: id, ...data }; this.notebooks.set(id, record); return { record, idempotent: false }
  }
  async renameNotebookAtomic(openid, id, version, changes) {
    const current = await this.getNotebook(openid, id)
    if (!current || current.status !== 'active') return { found: false }
    if (current.version !== version) return { found: true, versionConflict: true }
    const record = { ...current, ...changes, version: version + 1 }; this.notebooks.set(id, record); return { found: true, record }
  }
  async createEntryAtomic(openid, notebookId, id, data, updatedAt) {
    const notebook = await this.getNotebook(openid, notebookId)
    if (!notebook || notebook.status !== 'active') return { notebookFound: false }
    const existing = await this.getEntry(openid, id)
    if (existing) return { notebookFound: true, record: existing, idempotent: true }
    const record = { _id: id, ...data }; this.entries.set(id, record)
    this.notebooks.set(notebookId, { ...notebook, entryCount: notebook.entryCount + 1, version: notebook.version + 1, updatedAt })
    return { notebookFound: true, record, idempotent: false }
  }
  async updateEntryAtomic(openid, notebookId, entryId, version, requestId, changes, updatedAt) {
    const notebook = await this.getNotebook(openid, notebookId)
    if (!notebook || notebook.status !== 'active') return { notebookFound: false }
    const current = await this.getEntry(openid, entryId)
    if (!current || current.notebookId !== notebookId) return { notebookFound: true, entryFound: false }
    if (current.lastRequestId === requestId) return { notebookFound: true, entryFound: true, record: current, idempotent: true }
    if (current.version !== version) return { notebookFound: true, entryFound: true, versionConflict: true }
    const record = { ...current, ...changes, version: version + 1, lastRequestId: requestId }; this.entries.set(entryId, record)
    this.notebooks.set(notebookId, { ...notebook, version: notebook.version + 1, updatedAt })
    return { notebookFound: true, entryFound: true, record, idempotent: false }
  }
}

async function run() {
  assert.strictEqual(validateRequest({ action: 'createNotebook', title: '', requestId: 'request_123' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ action: 'createNotebook', title: 'a'.repeat(31), requestId: 'request_123' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ action: 'createNotebook', title: '培养记录', requestId: 'request_123', openid: 'forged' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ action: 'listNotebooks', _openid: 'forged' }).error, 'INVALID_PARAM')
  assert(validateRequest({ action: 'listNotebooks', userInfo: { appId: 'runtime' }, tcbContext: { env: 'runtime' } }).value, 'listNotebooks应忽略运行时系统元数据')
  assert(validateRequest({ action: 'createNotebook', title: '计划', requestId: 'journal_1756900000000_abc123def', userInfo: {}, tcbContext: {} }).value, 'createNotebook真实运行时结构应通过')
  assert(validateRequest({ action: 'saveEntry', notebookId: 'notebook_123', title: '', content: 'a'.repeat(5000), version: 0, requestId: 'request_456' }).value)
  assert.strictEqual(validateRequest({ action: 'saveEntry', notebookId: 'notebook_123', title: '', content: 'a'.repeat(5001), version: 0, requestId: 'request_456' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ action: 'saveEntry', notebookId: 'notebook_123', title: 'a'.repeat(51), content: '正文', version: 0, requestId: 'request_456' }).error, 'INVALID_PARAM')
  assert.strictEqual(notebookDocumentId('user-a', 'request_123'), notebookDocumentId('user-a', 'request_123'))
  assert.notStrictEqual(entryDocumentId('user-a', 'notebook_123', 'request_456'), entryDocumentId('user-a', 'notebook_999', 'request_456'))

  const repository = new MemoryRepository()
  let tick = 0
  const operations = createOperations(repository, () => `2026-09-03T10:${String(tick++).padStart(2, '0')}:00.000Z`)
  const created = await operations.createNotebook('user-a', { title: '培养记录', requestId: 'request_123' })
  const duplicate = await operations.createNotebook('user-a', { title: '培养记录', requestId: 'request_123' })
  assert(created.ok && duplicate.ok && duplicate.idempotent)
  assert.strictEqual(repository.notebooks.size, 1, '重复创建不能产生两份日志本')
  assert.strictEqual(JSON.stringify(created).includes('_openid'), false, '响应不得返回_openid')

  const renamed = await operations.renameNotebook('user-a', { notebookId: created.notebook._id, title: '新的名称', version: 1 })
  assert.strictEqual(renamed.notebook.title, '新的名称')
  assert.strictEqual((await operations.renameNotebook('user-a', { notebookId: created.notebook._id, title: '旧版本覆盖', version: 1 })).code, 'VERSION_CONFLICT')
  assert.strictEqual((await operations.renameNotebook('user-b', { notebookId: created.notebook._id, title: '越权', version: 2 })).code, 'NOTEBOOK_NOT_FOUND')

  for (let index = 1; index < 20; index += 1) await operations.createNotebook('limit-user', { title: `日志本${index}`, requestId: `limit_request_${index}` })
  await operations.createNotebook('limit-user', { title: '第20个', requestId: 'limit_request_20' })
  assert.strictEqual((await operations.createNotebook('limit-user', { title: '超出上限', requestId: 'limit_request_21' })).code, 'LIMIT_EXCEEDED')

  const notebookId = created.notebook._id
  const saved = await operations.saveEntry('user-a', { notebookId, title: '', content: '第一篇正文', version: 0, requestId: 'save_request_1' })
  const savedAgain = await operations.saveEntry('user-a', { notebookId, title: '', content: '第一篇正文', version: 0, requestId: 'save_request_1' })
  assert(saved.ok && savedAgain.idempotent)
  assert.strictEqual(JSON.stringify(saved).includes('lastRequestId'), false, '响应不得返回内部幂等字段')
  assert.strictEqual(repository.entries.size, 1, '重复保存不能产生重复日志')
  assert.strictEqual((await repository.getNotebook('user-a', notebookId)).entryCount, 1)
  assert.strictEqual((await operations.getEntry('user-a', { notebookId, entryId: saved.entry._id })).entry.content, '第一篇正文', '重新进入应回填正文')
  const updated = await operations.saveEntry('user-a', { notebookId, entryId: saved.entry._id, title: '更新标题', content: '更新正文', version: 1, requestId: 'save_request_2' })
  assert.strictEqual(updated.entry.version, 2)
  assert((await operations.saveEntry('user-a', { notebookId, entryId: saved.entry._id, title: '更新标题', content: '更新正文', version: 1, requestId: 'save_request_2' })).idempotent)
  assert.strictEqual((await operations.saveEntry('user-a', { notebookId, entryId: saved.entry._id, title: '冲突', content: '不会覆盖', version: 1, requestId: 'save_request_3' })).code, 'VERSION_CONFLICT')
  assert.strictEqual((await operations.getEntry('user-b', { notebookId, entryId: saved.entry._id })).code, 'NOTEBOOK_NOT_FOUND')
  assert.strictEqual((await operations.saveEntry('user-a', { notebookId: 'foreign_notebook', title: '', content: '越权', version: 0, requestId: 'save_request_4' })).code, 'NOTEBOOK_NOT_FOUND')

  const storage = new Map()
  global.wx = {
    setStorageSync(key, value) { storage.set(key, value) },
    getStorageSync(key) { return storage.get(key) },
    removeStorageSync(key) { storage.delete(key) }
  }
  const drafts = require('../utils/journal-draft')
  const draftKey = drafts.draftStorageKey(notebookId, saved.entry._id)
  assert(!draftKey.includes('user-a'), '草稿键不得包含用户身份')
  drafts.saveDraft(notebookId, saved.entry._id, { title: '草稿', content: '未保存正文', baseVersion: 2 })
  assert.strictEqual(drafts.readDraft(notebookId, saved.entry._id).content, '未保存正文')
  drafts.clearDraft(notebookId, saved.entry._id)
  assert.strictEqual(drafts.readDraft(notebookId, saved.entry._id), null)

  let pageDefinition
  let modalConfirm = true
  let navigateBackCount = 0
  global.getCurrentPages = () => [{ route: 'pages/cultivation/cultivation' }, { route: 'pages/journal-editor/journal-editor' }]
  Object.assign(global.wx, {
    showModal(options) { options.success({ confirm: modalConfirm, cancel: !modalConfirm }) },
    showToast() {},
    navigateBack() { navigateBackCount += 1 },
    enableAlertBeforeUnload() {},
    disableAlertBeforeUnload() {}
  })
  global.Page = (definition) => { pageDefinition = definition }
  const journalService = require('../services/journal-service')
  let capturedCalls = []
  global.wx.cloud = { callFunction({ name, data }) { capturedCalls.push({ name, data }); return Promise.resolve({ result: { ok: true, notebooks: [], notebook: {} } }) } }
  await journalService.listNotebooks()
  const generatedRequestId = journalService.createRequestId()
  await journalService.createNotebook('计划', generatedRequestId)
  assert.deepStrictEqual(capturedCalls[0], { name: 'journal', data: { action: 'listNotebooks' } })
  assert.deepStrictEqual(capturedCalls[1], { name: 'journal', data: { action: 'createNotebook', title: '计划', requestId: generatedRequestId } })
  assert(/^[A-Za-z0-9_-]{8,100}$/.test(generatedRequestId), '前端requestId必须符合云端格式和长度')
  assert(!capturedCalls.some((call) => Object.keys(call.data).some((key) => ['_openid', 'openid', 'openId', 'userId', 'ownerOpenId'].includes(key))))
  delete require.cache[require.resolve('../pages/journal-editor/journal-editor.js')]
  require('../pages/journal-editor/journal-editor.js')
  const makeEditorPage = () => ({
    ...pageDefinition,
    data: { ...pageDefinition.data, notebookId, entryId: saved.entry._id, version: 2, pageStatus: 'ready', form: { title: '更新标题', content: '更新正文' } },
    baseline: { title: '更新标题', content: '更新正文' },
    draftStorageId: saved.entry._id,
    setData(update, callback) { Object.assign(this.data, update); if (callback) callback() }
  })

  const restorePage = makeEditorPage()
  drafts.saveDraft(notebookId, saved.entry._id, { title: '恢复标题', content: '恢复正文', baseVersion: 2 })
  await restorePage.offerDraftRestore(restorePage.baseline)
  assert.deepStrictEqual(restorePage.data.form, { title: '恢复标题', content: '恢复正文' })

  const originalSaveEntry = journalService.saveEntry
  const failurePage = makeEditorPage()
  failurePage.updateForm({ content: '网络失败也要保留的正文' })
  journalService.saveEntry = async () => { const error = new Error('网络连接失败'); error.code = 'NETWORK_ERROR'; throw error }
  await failurePage.save()
  assert.strictEqual(failurePage.data.form.content, '网络失败也要保留的正文')
  assert.strictEqual(drafts.readDraft(notebookId, saved.entry._id).content, '网络失败也要保留的正文')

  const conflictPage = makeEditorPage()
  conflictPage.updateForm({ content: '冲突时保留的正文' })
  journalService.saveEntry = async () => { const error = new Error('版本冲突'); error.code = 'VERSION_CONFLICT'; throw error }
  await conflictPage.save()
  assert.strictEqual(conflictPage.data.form.content, '冲突时保留的正文')
  assert.strictEqual(conflictPage.data.hasVersionConflict, true)

  const repeatedPage = makeEditorPage()
  repeatedPage.updateForm({ content: '只提交一次' })
  let saveCalls = 0
  let releaseSave
  journalService.saveEntry = () => { saveCalls += 1; return new Promise((resolve) => { releaseSave = resolve }) }
  const firstSave = repeatedPage.save()
  const secondSave = repeatedPage.save()
  assert.strictEqual(saveCalls, 1, '重复点击保存只能提交一次')
  releaseSave({ ok: true })
  await Promise.all([firstSave, secondSave])
  assert.strictEqual(drafts.readDraft(notebookId, saved.entry._id), null, '云端成功后必须清除草稿')
  assert.strictEqual(navigateBackCount, 1)
  journalService.saveEntry = originalSaveEntry

  const root = path.resolve(__dirname, '..')
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
  for (const route of ['pages/journal-notebooks/journal-notebooks', 'pages/journal-entries/journal-entries', 'pages/journal-editor/journal-editor']) assert(app.pages.includes(route))
  for (const page of ['journal-notebooks', 'journal-entries', 'journal-editor']) {
    const wxml = fs.readFileSync(path.join(root, `pages/${page}/${page}.wxml`), 'utf8')
    for (const state of ['loading', 'empty', 'error', 'ready']) assert(wxml.includes(`pageStatus === '${state}'`))
  }
  const cultivation = fs.readFileSync(path.join(root, 'pages/cultivation/cultivation.wxml'), 'utf8')
  assert(cultivation.includes('bindtap="openJournal"'))
  const cloudSource = fs.readFileSync(path.join(root, 'cloudfunctions/journal/index.js'), 'utf8')
  assert.match(cloudSource, /cloud\.getWXContext\(\)/)
  assert(!cloudSource.includes('event._openid'))
  for (const field of ['_openid', 'openid', 'userId', 'ownerOpenId']) assert.strictEqual(validateRequest({ action: 'listNotebooks', [field]: 'forged' }).error, 'INVALID_PARAM')
  assert(cloudSource.includes('_openid: openid'))

  console.log('journal domain, security, idempotency, draft and page tests passed')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
