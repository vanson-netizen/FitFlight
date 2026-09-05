const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function main() {
  if (!process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT) throw new Error('缺少 MINIPROGRAM_AUTOMATOR_ENDPOINT')
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    const response = await miniProgram.evaluate(function listJournalNotebooks() {
      return new Promise(function call(resolve) {
        wx.cloud.callFunction({
          name: 'journal',
          data: { action: 'listNotebooks' },
          success(result) { resolve({ transportOk: true, result: result.result }) },
          fail(error) { resolve({ transportOk: false, error: { errCode: error && error.errCode, errMsg: error && error.errMsg } }) }
        })
      })
    })
    console.log(JSON.stringify(response, null, 2))
    if (!response || !response.transportOk || !response.result || response.result.ok !== true || !Array.isArray(response.result.notebooks)) process.exitCode = 1
    const page = await miniProgram.reLaunch('/pages/journal-notebooks/journal-notebooks')
    await page.waitFor(2000)
    const pageData = await page.data()
    console.log(JSON.stringify({ pageStatus: pageData.pageStatus, notebookCount: pageData.notebooks.length, errorMessage: pageData.errorMessage }, null, 2))
    if (pageData.pageStatus !== 'empty' || pageData.notebooks.length !== 0 || pageData.errorMessage) process.exitCode = 1
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
