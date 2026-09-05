const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    const response = await miniProgram.evaluate(function applyApprovedV1Once() {
      return new Promise(function call(resolve) {
        wx.cloud.callFunction({
          name: 'campusResourceAdmin',
          data: { action: 'applyApprovedV1' },
          success(result) { resolve({ transportOk: true, result: result.result }) },
          fail(error) { resolve({ transportOk: false, error: { errCode: error && error.errCode, errMsg: error && error.errMsg } }) }
        })
      })
    })
    console.log(JSON.stringify(response, null, 2))
    if (!response || !response.transportOk || !response.result || !response.result.ok) process.exitCode = 1
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
