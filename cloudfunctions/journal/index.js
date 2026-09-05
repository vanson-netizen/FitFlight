const cloud = require('wx-server-sdk')
const { NOTEBOOK_COLLECTION, ENTRY_COLLECTION, validateRequest } = require('./journal-core')
const { createOperations, failure } = require('./journal-operations')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

async function queryAll(query, pageSize = 100) {
  const records = []
  for (let offset = 0; ; offset += pageSize) {
    const result = await query.skip(offset).limit(pageSize).get()
    records.push(...result.data)
    if (result.data.length < pageSize) return records
  }
}

function createCloudRepository(database) {
  return {
    async listNotebooks(openid) {
      return queryAll(database.collection(NOTEBOOK_COLLECTION).where({ _openid: openid, status: 'active' }).orderBy('updatedAt', 'desc'))
    },
    async getNotebook(openid, notebookId) {
      const result = await database.collection(NOTEBOOK_COLLECTION).where({ _id: notebookId, _openid: openid, status: 'active' }).limit(1).get()
      return result.data[0] || null
    },
    async listEntries(openid, notebookId) {
      return queryAll(database.collection(ENTRY_COLLECTION).where({ _openid: openid, notebookId }).orderBy('updatedAt', 'desc'))
    },
    async getEntry(openid, entryId) {
      const result = await database.collection(ENTRY_COLLECTION).where({ _id: entryId, _openid: openid }).limit(1).get()
      return result.data[0] || null
    },
    async createNotebookAtomic(openid, id, data, limit) {
      return database.runTransaction(async (transaction) => {
        const notebooks = transaction.collection(NOTEBOOK_COLLECTION)
        const existing = await notebooks.where({ _id: id, _openid: openid }).limit(1).get()
        if (existing.data[0]) return { record: existing.data[0], idempotent: true }
        const count = await notebooks.where({ _openid: openid, status: 'active' }).count()
        if (count.total >= limit) return { limitExceeded: true }
        await notebooks.doc(id).set({ data })
        return { record: { _id: id, ...data }, idempotent: false }
      })
    },
    async renameNotebookAtomic(openid, notebookId, expectedVersion, changes) {
      return database.runTransaction(async (transaction) => {
        const notebooks = transaction.collection(NOTEBOOK_COLLECTION)
        const result = await notebooks.where({ _id: notebookId, _openid: openid, status: 'active' }).limit(1).get()
        const current = result.data[0]
        if (!current) return { found: false }
        if (current.version !== expectedVersion) return { found: true, versionConflict: true }
        const next = { ...current, ...changes, version: current.version + 1 }
        await notebooks.where({ _id: notebookId, _openid: openid, status: 'active' }).update({ data: { ...changes, version: next.version } })
        return { found: true, record: next }
      })
    },
    async createEntryAtomic(openid, notebookId, entryId, data, updatedAt) {
      return database.runTransaction(async (transaction) => {
        const notebooks = transaction.collection(NOTEBOOK_COLLECTION)
        const notebookResult = await notebooks.where({ _id: notebookId, _openid: openid, status: 'active' }).limit(1).get()
        const notebook = notebookResult.data[0]
        if (!notebook) return { notebookFound: false }
        const entries = transaction.collection(ENTRY_COLLECTION)
        const existingResult = await entries.where({ _id: entryId, _openid: openid, notebookId }).limit(1).get()
        if (existingResult.data[0]) return { notebookFound: true, record: existingResult.data[0], idempotent: true }
        await entries.doc(entryId).set({ data })
        await notebooks.where({ _id: notebookId, _openid: openid, status: 'active' }).update({ data: { entryCount: command.inc(1), version: command.inc(1), updatedAt } })
        return { notebookFound: true, record: { _id: entryId, ...data }, idempotent: false }
      })
    },
    async updateEntryAtomic(openid, notebookId, entryId, expectedVersion, requestId, changes, notebookUpdatedAt) {
      return database.runTransaction(async (transaction) => {
        const notebookResult = await transaction.collection(NOTEBOOK_COLLECTION).where({ _id: notebookId, _openid: openid, status: 'active' }).limit(1).get()
        if (!notebookResult.data[0]) return { notebookFound: false }
        const entries = transaction.collection(ENTRY_COLLECTION)
        const entryResult = await entries.where({ _id: entryId, _openid: openid, notebookId }).limit(1).get()
        const current = entryResult.data[0]
        if (!current) return { notebookFound: true, entryFound: false }
        if (current.lastRequestId === requestId) return { notebookFound: true, entryFound: true, record: current, idempotent: true }
        if (current.version !== expectedVersion) return { notebookFound: true, entryFound: true, versionConflict: true }
        const next = { ...current, ...changes, version: current.version + 1, lastRequestId: requestId }
        await entries.where({ _id: entryId, _openid: openid, notebookId }).update({ data: { ...changes, version: next.version, lastRequestId: requestId } })
        await transaction.collection(NOTEBOOK_COLLECTION).where({ _id: notebookId, _openid: openid, status: 'active' }).update({ data: { version: command.inc(1), updatedAt: notebookUpdatedAt } })
        return { notebookFound: true, entryFound: true, record: next, idempotent: false }
      })
    }
  }
}

const operations = createOperations(createCloudRepository(db), () => db.serverDate())

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure('UNAUTHORIZED', '无法确认当前用户身份')
  const validation = validateRequest(event)
  if (validation.error) return failure('INVALID_PARAM', '请求参数无效')
  try {
    return await operations[validation.value.action](OPENID, validation.value)
  } catch (error) {
    console.error('journal operation failed', { action: validation.value.action, code: error && error.code })
    return failure('SERVER_ERROR', '日志服务暂时不可用，请稍后重试')
  }
}

module.exports.createCloudRepository = createCloudRepository
