const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

const CLI_PATH = 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat'
const PROJECT_PATH = 'C:/Users/31598/WeChatProjects/miniprogram-1'

async function main() {
  if (!process.env.MINIPROGRAM_AUTOMATOR_PATH) throw new Error('缺少 MINIPROGRAM_AUTOMATOR_PATH')
  const miniProgram = process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT
    ? await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
    : await automator.launch({
      cliPath: CLI_PATH,
      projectPath: PROJECT_PATH,
      port: 9420,
      args: ['--port', '59112'],
      trustProject: true,
      timeout: 60000
    })
  try {
    const response = await miniProgram.evaluate(function inspectApprovedV1() {
      return new Promise(function call(resolve) {
        wx.cloud.callFunction({
          name: 'campusResourceAdmin',
          data: { action: 'inspectApprovedV1' },
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
