const cloud = require('wx-server-sdk')
const { validate } = require('./validator')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COLLECTION_NAME = 'body_profiles'
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, code: 'UNAUTHORIZED', message: '无法确认用户身份' }

  const validation = validate(event)
  if (validation.errors) {
    return { ok: false, code: 'INVALID_PARAM', message: '身体信息填写有误', fieldErrors: validation.errors }
  }

  const now = db.serverDate()
  const collection = db.collection(COLLECTION_NAME)
  const existing = await collection.where({ _openid: OPENID }).limit(1).get()
  const data = { ...validation.value, updatedAt: now }
  let action
  let recordId

  if (existing.data.length > 0) {
    recordId = existing.data[0]._id
    await collection.doc(recordId).update({ data })
    action = 'updated'
  } else {
    const result = await collection.add({ data: { ...data, _openid: OPENID, createdAt: now } })
    recordId = result._id
    action = 'created'
  }

  console.info('body profile saved', { action, recordId })
  // 响应不暴露 OPENID，也不接受记录 ID，因此调用者无法定位其他用户记录。
  return { ok: true, profile: validation.value }
}
