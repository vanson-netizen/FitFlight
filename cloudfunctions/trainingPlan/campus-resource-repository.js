const EMPTY_RESOURCES = Object.freeze({ resourceDataVersion: 'campus-resources-unavailable', venues: [], diningHalls: [], foodOptions: [] })

function createRepository(db) {
  async function readCollection(name) {
    const result = await db.collection(name).where({ status: db.command.in(['pending_verification', 'verified', 'expired']) }).limit(1000).get()
    return result.data || []
  }
  return { async load() {
    const [venues, diningHalls, foodOptions] = await Promise.all([readCollection('campus_venues'), readCollection('campus_dining_halls'), readCollection('campus_food_options')])
    const versions = [...venues, ...diningHalls, ...foodOptions].map((item) => item.dataVersion).filter(Boolean).sort()
    return { resourceDataVersion: versions[versions.length - 1] || 'campus-resources-empty', venues, diningHalls, foodOptions }
  } }
}

async function loadOrEmpty(repository) {
  if (!repository || typeof repository.load !== 'function') return EMPTY_RESOURCES
  try { return await repository.load() } catch (error) { return EMPTY_RESOURCES }
}

async function upsertBatch(db, payload) {
  if (!payload || (payload.errors && payload.errors.length)) throw new Error('资源批次未通过校验，禁止部分导入')
  const collections = payload.collections || {}
  const names = ['campus_venues', 'campus_dining_halls', 'campus_food_options']
  return db.runTransaction(async (transaction) => {
    const counts = { insert: 0, update: 0, unchanged: 0 }
    for (const name of names) {
      for (const record of collections[name] || []) {
        if (!record._id || !record.contentHash) throw new Error('资源缺少稳定 ID 或 contentHash')
        const collection = transaction.collection(name); const existing = await collection.doc(record._id).get().catch(() => ({ data: null }))
        if (existing.data && existing.data.contentHash === record.contentHash) { counts.unchanged += 1; continue }
        if (existing.data) { const next = { ...record, updatedAt: db.serverDate() }; delete next.createdAt; await collection.doc(record._id).update({ data: next }); counts.update += 1 }
        else { await collection.doc(record._id).set({ data: { ...record, createdAt: db.serverDate(), updatedAt: db.serverDate() } }); counts.insert += 1 }
      }
    }
    return counts
  })
}

module.exports = { EMPTY_RESOURCES, createRepository, loadOrEmpty, upsertBatch }
