const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

const requests = [
  ['sport', 'gym'], ['sport', 'ball_sports'], ['sport', 'swimming'], ['sport', 'track_and_other'],
  ['food', 'dining_hall'], ['food', 'healthy_light_meal'], ['food', 'high_protein'], ['food', 'other_food']
]

async function main() {
  if (!process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT) throw new Error('缺少 MINIPROGRAM_AUTOMATOR_ENDPOINT')
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    const results = await miniProgram.evaluate(function diagnoseResources(input) {
      return Promise.all(input.map(function requestResource(pair) {
        return new Promise(function call(resolve) {
          const data = { action: 'listCampusResources', type: pair[0], category: pair[1] }
          wx.cloud.callFunction({
            name: 'trainingPlan',
            config: { env: 'cloud1-d2gdhogc6193c3024' },
            data,
            success(response) {
              const result = response.result || {}
              resolve({ action: data.action, type: data.type, category: data.category, transportOk: true, ok: result.ok === true, code: result.code || null, requestID: response.requestID, diagnostics: result.diagnostics, itemCount: Array.isArray(result.items) ? result.items.length : null, statuses: Array.isArray(result.items) ? [...new Set(result.items.map(function itemStatus(item) { return item.verificationStatus }))] : [] })
            },
            fail(error) { resolve({ action: data.action, type: data.type, category: data.category, transportOk: false, code: error && error.errCode, message: error && error.errMsg }) }
          })
        })
      }))
    }, requests)
    console.log(JSON.stringify(results, null, 2))
    if (results.some((result) => !result.transportOk || !result.ok)) process.exitCode = 1
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
