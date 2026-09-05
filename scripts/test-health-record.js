const assert = require('assert')
const fs = require('fs')
const { validateRequest, recordDocumentId, publicRecord } = require('../cloudfunctions/healthRecord/health-record-core')
const { createOperations } = require('../cloudfunctions/healthRecord/health-record-operations')
const { buildTrend, evaluateHealthPrompts } = require('../utils/health-trend')

class MemoryRepository {
  constructor() { this.records = new Map() }
  async list(openid) { return Array.from(this.records.values()).filter((item) => item._openid === openid).sort((a, b) => b.recordDate.localeCompare(a.recordDate)) }
  async get(openid, id) { const value = this.records.get(id); return value && value._openid === openid ? value : null }
  async saveAtomic(openid, id, version, fields, timestamp) {
    const current = await this.get(openid, id); const currentVersion = current ? current.version : 0
    if (currentVersion !== version) return { versionConflict: true }
    const record = current ? { ...current, ...fields, version: version + 1, updatedAt: timestamp } : { _id: id, _openid: openid, ...fields, version: 1, createdAt: timestamp, updatedAt: timestamp }
    this.records.set(id, record); return { record }
  }
}

async function run() {
  const valid = { action: 'saveRecord', recordDate: '2026-09-03', weightKg: 70, sleepHours: null, energyLevel: 'good', bodyFeeling: 'normal', note: '', version: 0 }
  assert(validateRequest(valid).value)
  assert.strictEqual(validateRequest({ ...valid, weightKg: null, energyLevel: null, bodyFeeling: null }).error, 'INVALID_PARAM', '备注不能替代健康指标')
  assert.strictEqual(validateRequest({ ...valid, recordDate: '2026-02-30' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ ...valid, weightKg: 19 }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ ...valid, sleepHours: 25 }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ ...valid, energyLevel: 'great' }).error, 'INVALID_PARAM')
  assert.strictEqual(validateRequest({ action: 'listRecords', userInfo: {}, tcbContext: {} }).value.action, 'listRecords')
  for (const field of ['_openid', 'openid', 'openId', 'userId', 'ownerOpenId']) assert.strictEqual(validateRequest({ action: 'listRecords', [field]: 'forged' }).error, 'INVALID_PARAM')
  assert.strictEqual(recordDocumentId('a', '2026-09-03'), recordDocumentId('a', '2026-09-03'))
  assert.notStrictEqual(recordDocumentId('a', '2026-09-03'), recordDocumentId('b', '2026-09-03'))

  const repository = new MemoryRepository(); let tick = 0
  const operations = createOperations(repository, () => `time-${tick++}`)
  const first = await operations.saveRecord('a', validateRequest(valid).value)
  assert(first.ok && first.record.version === 1)
  assert.strictEqual(JSON.stringify(first).includes('_openid'), false)
  assert.strictEqual((await operations.saveRecord('a', validateRequest({ ...valid, weightKg: 71 }).value)).code, 'VERSION_CONFLICT')
  const updated = await operations.saveRecord('a', validateRequest({ ...valid, weightKg: 71, version: 1 }).value)
  assert.strictEqual(updated.record.version, 2)
  assert.strictEqual(repository.records.size, 1, '同一用户同一天只能有一条记录')
  assert.strictEqual((await operations.getRecord('b', { recordDate: '2026-09-03' })).record, null, '用户不能读取他人记录')
  assert.strictEqual(publicRecord(repository.records.values().next().value)._openid, undefined)

  const records = [{ recordDate: '2026-09-01', weightKg: 70, sleepHours: 7, energyLevel: 'normal' }, { recordDate: '2026-09-03', weightKg: 72.2, sleepHours: 8, energyLevel: 'good' }]
  assert.strictEqual(buildTrend(records.slice(0, 1), 'weightKg', '30', '2026-09-03').status, 'insufficient')
  assert.strictEqual(buildTrend(records, 'weightKg', '30', '2026-09-03').change, 2.2)
  assert.strictEqual(buildTrend(records, 'sleepHours', '7', '2026-09-03').status, 'ready')
  assert.strictEqual(buildTrend([{ recordDate: '2026-07-01', weightKg: 60 }, ...records], 'weightKg', '7', '2026-09-03').points.length, 2)
  assert.strictEqual(buildTrend([{ recordDate: '2026-07-01', weightKg: 60 }, ...records], 'weightKg', 'all', '2026-09-03').points.length, 3)
  assert.strictEqual(evaluateHealthPrompts(records.slice(0, 1), { currentWeightKg: 64 }).prompts.some((item) => item.key === 'noticeable_weight_change'), false, '一次记录不能判断近期趋势')
  const prompts = evaluateHealthPrompts(records, { currentWeightKg: 66 })
  assert.strictEqual(prompts.shouldOfferProfileUpdate, true)
  assert(prompts.prompts.some((item) => item.status === 'product_draft'))

  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
  for (const route of ['pages/health-records/health-records', 'pages/health-record-editor/health-record-editor', 'pages/health-trends/health-trends']) assert(app.pages.includes(route))
  for (const page of ['health-records', 'health-record-editor', 'health-trends']) { const wxml = fs.readFileSync(`pages/${page}/${page}.wxml`, 'utf8'); for (const state of ['loading', 'empty', 'error', 'ready']) assert(wxml.includes(`pageStatus === '${state}'`)) }
  const cultivation = fs.readFileSync('pages/cultivation/cultivation.wxml', 'utf8'); assert(cultivation.includes('bindtap="openHealthRecords"'))
  const cloudSource = fs.readFileSync('cloudfunctions/healthRecord/index.js', 'utf8'); assert(cloudSource.includes('cloud.getWXContext()')); assert(!/body_profiles|user_portraits|training_plans/.test(cloudSource))
  const homeSource = fs.readFileSync('pages/health-records/health-records.js', 'utf8'); assert(homeSource.includes('prefillWeightKg=')); assert(homeSource.includes('getActivePlan().catch(() => null)'))

  let sentData
  global.wx = { cloud: { callFunction({ data }) { sentData = data; return Promise.resolve({ result: { ok: true, records: [] } }) } } }
  const service = require('../services/health-record-service')
  await service.listRecords()
  assert.deepStrictEqual(sentData, { action: 'listRecords' })
  await service.saveRecord(valid)
  assert.deepStrictEqual(Object.keys(sentData).sort(), ['action', 'bodyFeeling', 'energyLevel', 'note', 'recordDate', 'sleepHours', 'version', 'weightKg'].sort())
  assert(!Object.keys(sentData).some((key) => ['_openid', 'openid', 'openId', 'userId', 'ownerOpenId'].includes(key)))

  let editorDefinition
  global.Page = (definition) => { editorDefinition = definition }
  global.wx.showToast = () => {}; global.wx.navigateBack = () => {}
  delete require.cache[require.resolve('../pages/health-record-editor/health-record-editor.js')]
  require('../pages/health-record-editor/health-record-editor.js')
  const page = { ...editorDefinition, data: { ...editorDefinition.data, pageStatus: 'ready', form: { ...valid } }, setData(update) { Object.assign(this.data, update) } }
  const originalSave = service.saveRecord
  service.saveRecord = async () => { throw new Error('网络失败') }
  await page.save()
  assert.strictEqual(page.data.form.weightKg, 70, '保存失败不得清空输入')
  let calls = 0; let release
  service.saveRecord = () => { calls += 1; return new Promise((resolve) => { release = resolve }) }
  const firstSave = page.save(); const secondSave = page.save(); assert.strictEqual(calls, 1, '保存中重复点击不得重复提交'); release({ ok: true }); await Promise.all([firstSave, secondSave])
  service.saveRecord = originalSave
  console.log('health record validation, ownership, versioning, trend and page tests passed')
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
