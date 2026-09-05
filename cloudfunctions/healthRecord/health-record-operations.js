const { recordDocumentId, publicRecord } = require('./health-record-core')

function failure(code, message) { return { ok: false, code, message } }
function createOperations(repository, now) {
  async function listRecords(openid) { return { ok: true, records: (await repository.list(openid)).map(publicRecord) } }
  async function getRecord(openid, input) { return { ok: true, record: publicRecord(await repository.get(openid, recordDocumentId(openid, input.recordDate))) } }
  async function saveRecord(openid, input) {
    const id = recordDocumentId(openid, input.recordDate)
    const timestamp = now()
    const fields = { recordDate: input.recordDate, weightKg: input.weightKg, sleepHours: input.sleepHours, energyLevel: input.energyLevel, bodyFeeling: input.bodyFeeling, note: input.note }
    const result = await repository.saveAtomic(openid, id, input.version, fields, timestamp)
    if (result.versionConflict) return failure('VERSION_CONFLICT', '健康记录已在其他设备更新，请重新加载')
    return { ok: true, record: publicRecord(result.record) }
  }
  return { listRecords, getRecord, saveRecord }
}
module.exports = { createOperations, failure }
