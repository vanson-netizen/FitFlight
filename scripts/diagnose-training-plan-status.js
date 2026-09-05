const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    const response = await miniProgram.evaluate(function diagnoseGetStatus() {
      return new Promise(function call(resolve) {
        const startedAt = Date.now()
        wx.cloud.callFunction({
          name: 'trainingPlan',
          data: { action: 'getStatus' },
          success(result) {
            const value = result && result.result
            resolve({
              transportOk: true,
              durationMs: Date.now() - startedAt,
              contract: value && typeof value === 'object' ? {
                ok: value.ok,
                code: value.code || null,
                message: value.message || null,
                planStatus: value.planStatus || null,
                hasActivePlan: Boolean(value.activePlan),
                keys: Object.keys(value)
              } : { resultType: typeof value }
            })
          },
          fail(error) {
            resolve({ transportOk: false, durationMs: Date.now() - startedAt, error: { errCode: error && error.errCode, errMsg: error && error.errMsg } })
          }
        })
      })
    })
    console.log(JSON.stringify(response, null, 2))
    if (!response || !response.transportOk) process.exitCode = 1
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
