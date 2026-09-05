const cloud = require('wx-server-sdk')
const release = require('./buaa-resources-student-v1.json')
const { writeChangedRecords } = require('./transaction-writer')

const TARGET_ENV = 'cloud1-d2gdhogc6193c3024'
const COLLECTION_NAMES = ['campus_venues', 'campus_dining_halls', 'campus_food_options']
cloud.init({ env: TARGET_ENV })
const db = cloud.database()

function failure(code, message, extra = {}) { return { ok: false, code, message, ...extra } }
function publicComparison(comparison) { return { insert: comparison.insert, update: comparison.update, unchanged: comparison.unchanged, conflict: comparison.conflict } }

async function inspect() {
  const comparison = { insert: [], update: [], unchanged: [], conflict: [] }
  const collectionRecordCounts = {}
  for (const collectionName of COLLECTION_NAMES) {
    const collection = db.collection(collectionName)
    collectionRecordCounts[collectionName] = (await collection.count()).total
    for (const expected of release.collections[collectionName]) {
      let existing = null
      try { const result = await collection.doc(expected._id).get(); existing = result.data || null } catch (error) { if (!/not exist|does not exist|DATABASE_REQUEST_FAILED/i.test(String(error.errMsg || error.message || error))) throw error }
      const item = { collection: collectionName, id: expected._id, contentHash: expected.contentHash }
      if (!existing) comparison.insert.push(item)
      else if (existing.contentHash === expected.contentHash) comparison.unchanged.push(item)
      else if (existing.dataVersion && existing.dataVersion !== release.dataVersion) comparison.conflict.push({ ...item, existingDataVersion: existing.dataVersion })
      else comparison.update.push(item)
    }
  }
  comparison.collectionRecordCounts = collectionRecordCounts
  return comparison
}

async function apply(openid) {
  if (process.env.CAMPUS_RESOURCE_APPLY_ENABLED !== 'true') return failure('APPLY_DISABLED', '固定批次写入入口未开启')
  const adminOpenId = process.env.CAMPUS_RESOURCE_ADMIN_OPENID
  if (!adminOpenId || openid !== adminOpenId) return failure('FORBIDDEN', '仅指定管理者可执行固定批次写入')
  const before = await inspect()
  if (before.conflict.length) return failure('RESOURCE_CONFLICT', '线上存在不同版本的同 ID 记录，已停止写入', { comparison: publicComparison(before) })
  const changed = [...before.insert, ...before.update]
  await writeChangedRecords(db, release, changed)
  const after = await inspect()
  if (after.insert.length || after.update.length || after.conflict.length || after.unchanged.length !== 23) return failure('POST_WRITE_VERIFICATION_FAILED', '事务已返回但写后核对未通过', { comparison: publicComparison(after) })
  return { ok: true, environmentId: TARGET_ENV, dataVersion: release.dataVersion, comparisonBefore: publicComparison(before), comparisonAfter: publicComparison(after), applyMustBeDisabled: true }
}

exports.main = async (event = {}) => {
  const keys = Object.keys(event).filter((key) => !['action', 'tcbContext', 'userInfo'].includes(key))
  if (keys.length || !['inspectApprovedV1', 'applyApprovedV1'].includes(event.action)) return failure('INVALID_PARAM', '只接受固定批次管理动作')
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure('UNAUTHORIZED', '无法确认调用者身份')
  if (event.action === 'inspectApprovedV1') {
    const comparison = await inspect()
    return { ok: true, environmentId: TARGET_ENV, dataVersion: release.dataVersion, applyEnabled: process.env.CAMPUS_RESOURCE_APPLY_ENABLED === 'true', collectionRecordCounts: comparison.collectionRecordCounts, comparison: publicComparison(comparison) }
  }
  return apply(OPENID)
}
