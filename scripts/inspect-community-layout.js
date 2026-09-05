const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    for (const type of ['sport', 'food']) {
      await mini.callWxMethod('reLaunch', { url: `/pages/community-${type}/community-${type}` })
      await new Promise((resolve) => setTimeout(resolve, 4000))
      const data = await mini.evaluate(() => {
        const pages = getCurrentPages()
        const data = pages[pages.length - 1].data
        return { pageStatus: data.pageStatus, resources: data.resources }
      })
      const rects = await mini.evaluate(() => new Promise((resolve) => {
        wx.createSelectorQuery().select('.resource-layout').boundingClientRect()
          .select('.category-nav').boundingClientRect().select('.resource-pane').boundingClientRect()
          .select('.resource-list').boundingClientRect().exec(resolve)
      }))
      console.log(JSON.stringify({ type, status: data.pageStatus, count: data.resources.length, rects }))
    }
  } finally { mini.disconnect() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
