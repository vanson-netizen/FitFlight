const cloud = require('wx-server-sdk')
const { COLLECTION, validateRequest } = require('./health-record-core')
const { createOperations, failure } = require('./health-record-operations')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function createRepository(database) {
  return {
    async list(openid) {
      const records = []
      const query = database.collection(COLLECTION).where({ _openid: openid }).orderBy('recordDate', 'desc')
      for (let offset = 0; ; offset += 100) {
        const result = await query.skip(offset).limit(100).get(); records.push(...result.data)
        if (result.data.length < 100) return records
      }
    },
    async get(openid, id) {
      const result = await database.collection(COLLECTION).where({ _id: id, _openid: openid }).limit(1).get()
      return result.data[0] || null
    },
    async saveAtomic(openid, id, expectedVersion, fields, timestamp) {
      return database.runTransaction(async (transaction) => {
        const records = transaction.collection(COLLECTION)
        const result = await records.where({ _id: id, _openid: openid }).limit(1).get()
        const current = result.data[0] || null
        const version = current ? current.version : 0
        if (version !== expectedVersion) return { versionConflict: true }
        if (current) {
          const next = { ...current, ...fields, version: version + 1, updatedAt: timestamp }
          await records.where({ _id: id, _openid: openid }).update({ data: { ...fields, version: next.version, updatedAt: timestamp } })
          return { record: next }
        }
        const record = { _id: id, _openid: openid, ...fields, version: 1, createdAt: timestamp, updatedAt: timestamp }
        const { _id, ...data } = record
        await records.doc(_id).set({ data })
        return { record }
      })
    }
  }
}

const operations = createOperations(createRepository(db), () => db.serverDate())
exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure('UNAUTHORIZED', '无法确认当前用户身份')
  const validation = validateRequest(event)
  if (validation.error) return failure('INVALID_PARAM', '健康记录参数无效')
  try { return await operations[validation.value.action](OPENID, validation.value) } catch (error) {
    console.error('health record operation failed', { action: validation.value.action, code: error && error.code })
    return failure('SERVER_ERROR', '健康记录服务暂时不可用，请稍后重试')
  }
}
module.exports.createRepository = createRepository
