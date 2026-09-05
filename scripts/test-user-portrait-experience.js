const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const portraitCloudSource = fs.readFileSync(path.join(root, 'cloudfunctions/userPortrait/index.js'), 'utf8')
const bodyProfileCloudSource = fs.readFileSync(path.join(root, 'cloudfunctions/saveBodyProfile/index.js'), 'utf8')
const { CLOUD_ENV_ID } = require('../constants/cloud')

function verifyCloudOwnershipAndCreation() {
  assert.match(portraitCloudSource, /cloud\.getWXContext\(\)/, '画像身份必须来自微信上下文')
  assert.match(portraitCloudSource, /\.where\(\{ _openid: openid \}\)/, '画像读取必须按当前用户隔离')
  assert.match(portraitCloudSource, /\.add\(\{ data: \{ \.\.\.stored, _openid: openid, createdAt: now \} \}\)/, '新用户画像必须创建文档')
  assert.match(portraitCloudSource, /_id: context\.portrait\._id,\s+_openid: openid,\s+portraitVersion:/, '已有画像更新必须校验用户和版本')
  assert.match(portraitCloudSource, /SAVE_SAFETY_SCREENING\) result = await saveSafetyScreening\(OPENID, event, trace\)/, '云函数必须实现安全筛查 action')
  assert.match(bodyProfileCloudSource, /cloud\.getWXContext\(\)/, '身体档案身份必须来自微信上下文')
  assert.match(bodyProfileCloudSource, /data: \{ \.\.\.value, _openid: openid, profileVersion, createdAt: now, updatedAt: now \}/, '新用户身体档案必须创建并绑定用户')
}

async function verifyFrontendContractAndRetry() {
  const calls = []
  const warnings = []
  let attempt = 0
  const originalWarn = console.warn
  const originalInfo = console.info
  console.warn = (...args) => warnings.push(args)
  console.info = () => {}
  global.wx = {
    cloud: {
      callFunction(options) {
        calls.push(JSON.parse(JSON.stringify(options)))
        attempt += 1
        if (attempt === 1) {
          return Promise.reject({ errCode: -1, errMsg: 'network timeout', requestID: 'retry-request-1' })
        }
        return Promise.resolve({ result: { ok: true, portraitVersion: attempt }, requestID: `retry-request-${attempt}` })
      }
    }
  }

  const service = require('../services/user-portrait-service')
  const portrait = {
    campus: 'shahe',
    trainingGoal: 'fitness_improvement',
    availableDaysPerWeek: 3,
    sessionDurationMinutes: 30,
    experienceLevel: 'beginner',
    equipmentAccess: 'bodyweight',
    exercisePreferences: ['walking'],
    exerciseLimitationStatus: 'none'
  }

  try {
    await assert.rejects(service.savePortrait(portrait, 0), (error) => {
      assert.strictEqual(error.code, 'NETWORK_ERROR')
      assert.strictEqual(error.requestId, 'retry-request-1')
      return true
    })
    await service.savePortrait(portrait, 0)
    await service.saveSafetyScreening({ answers: {}, confirmed: true }, 1)
    await service.savePortrait(portrait, 2)
  } finally {
    console.warn = originalWarn
    console.info = originalInfo
    delete global.wx
  }

  calls.forEach((call) => assert.deepStrictEqual(call.config, { env: CLOUD_ENV_ID }, '每次调用必须固定到体验版云环境'))
  assert.deepStrictEqual(calls[0].data, calls[1].data, '失败重试必须保留相同输入')
  assert.strictEqual(calls[0].data.action, 'savePortrait', '首次生成 action 必须匹配云函数契约')
  assert.strictEqual(calls[2].data.action, 'saveSafetyScreening', '安全筛查 action 必须匹配云函数契约')
  assert.strictEqual(calls[3].data.expectedPortraitVersion, 2, '已有用户修改必须携带当前版本')
  assert.deepStrictEqual(warnings[0][1], {
    action: 'savePortrait',
    code: 'NETWORK_ERROR',
    requestId: 'retry-request-1',
    stage: 'failure'
  }, '失败日志只能记录安全诊断字段')
}

async function main() {
  verifyCloudOwnershipAndCreation()
  await verifyFrontendContractAndRetry()
  console.log('user portrait experience tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
