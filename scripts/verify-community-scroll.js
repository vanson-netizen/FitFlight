const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function inspectPage(miniProgram, route, switchCategory = false) {
  const page = await miniProgram.reLaunch(route)
  await page.waitFor(3000)
  const list = await page.$('.resource-list')
  const categories = await page.$('.category-nav')
  if (!list || !categories) throw new Error(`${route} missing native scroll views`)
  const listViewport = await list.size()
  const categoryViewport = await categories.size()
  const listContentHeight = await list.scrollHeight()
  await list.scrollTo(0, 100000)
  await page.waitFor(300)
  const bottomScrollTop = await list.property('scrollTop')
  let switchedScrollTop = null
  if (switchCategory) {
    const categoryItems = await page.$$('.category-item')
    if (categoryItems.length < 2) throw new Error(`${route} has no second category`)
    await categoryItems[1].tap()
    await page.waitFor(2500)
    switchedScrollTop = await list.property('scrollTop')
  }
  const data = await page.data()
  return { route, listViewport, listContentHeight, categoryViewport, bottomScrollTop, switchedScrollTop, pageStatus: data.pageStatus, resourceCount: data.resources.length }
}

async function main() {
  const miniProgram = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    const sport = await inspectPage(miniProgram, '/pages/community-sport/community-sport', true)
    const food = await inspectPage(miniProgram, '/pages/community-food/community-food', false)
    console.log(JSON.stringify({ sport, food }, null, 2))
    for (const result of [sport, food]) {
      if (!(Number(result.listViewport.height) > 0) || !(Number(result.categoryViewport.height) > 0)) throw new Error(`${result.route} has no definite scroll height`)
      if (!(Number(result.listContentHeight) >= Number(result.listViewport.height))) throw new Error(`${result.route} content does not fill scroll viewport`)
      if (!(Number(result.bottomScrollTop) > 0)) throw new Error(`${result.route} did not scroll`)
    }
    if (Number(sport.switchedScrollTop) > 1) throw new Error('sport category switch did not reset list to top')
  } finally {
    miniProgram.disconnect()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
