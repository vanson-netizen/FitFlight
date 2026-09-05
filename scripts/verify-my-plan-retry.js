const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    let page = await miniProgram.currentPage()
    if (!page || page.path !== 'pages/my-plan/my-plan') page = await miniProgram.reLaunch('/pages/my-plan/my-plan')
    await page.waitFor(2500)
    const before = await page.data()
    let retryClicked = false
    if (before.loadStatus === 'error') {
      const retry = await page.$('.action-button')
      if (!retry) throw new Error('error state has no retry button')
      await retry.tap()
      retryClicked = true
      await page.waitFor(2500)
    }
    const after = await page.data()
    console.log(JSON.stringify({
      page: page.path,
      beforeLoadStatus: before.loadStatus,
      retryClicked,
      afterLoadStatus: after.loadStatus,
      planStatus: after.viewState && after.viewState.isActive ? 'active' : null,
      hasActivePlan: Boolean(after.activePlan),
      errorMessage: after.errorMessage || null
    }, null, 2))
    if (after.loadStatus !== 'ready' || !after.activePlan) process.exitCode = 1
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
