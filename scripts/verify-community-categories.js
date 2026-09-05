const assert = require('assert')
const automator = require(process.env.MINIPROGRAM_AUTOMATOR_PATH)

async function settle(page) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const data = await page.data()
    if (data.pageStatus !== 'loading') return data
    await page.waitFor(250)
  }
  throw new Error('Resource loading timeout')
}
async function main() {
  const mini = await automator.connect({ wsEndpoint: process.env.MINIPROGRAM_AUTOMATOR_ENDPOINT })
  try {
    for (const type of ['sport', 'food']) {
      await mini.callWxMethod('reLaunch', { url: `/pages/community-${type}/community-${type}` })
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const page = await mini.currentPage()
      const categories = await page.$$('.category-item')
      for (let i = 0; i < categories.length; i += 1) {
        if (i) await categories[i].tap()
        const data = await settle(page)
        const cards = await page.$$('.resource-card')
        const list = await page.$('.resource-list')
        const size = await list.size()
        assert.ok(size.width > 0 && size.height > 0)
        assert.strictEqual(cards.length, data.resources.length)
        assert.strictEqual(data.pageStatus, cards.length ? 'success' : 'empty')
        assert.ok(Number(await list.property('scrollTop')) <= 1, 'category should start at top')
        console.log(JSON.stringify({ type, category: data.selectedCategoryId, status: data.pageStatus, count: cards.length, size }))
        await list.scrollTo(0, 100000)
        await page.waitFor(100)
      }
    }
  } finally { mini.disconnect() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
