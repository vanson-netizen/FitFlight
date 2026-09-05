const assert = require('assert')
const { homeLayout, applyHomeLayout, updateHomeLayout } = require('../pages/community/home-layout')
const { homeFocus } = require('../constants/community-resource-images')

for (const [width, available] of [[320, 390], [375, 440], [390, 650], [430, 690]]) {
  const scale = width / 750
  const headingHeight = 115 * scale
  const result = homeLayout({ windowWidth: width, availableHeight: available, headingHeight })
  assert.ok(result.cardHeight >= 200)
  assert.ok(Math.abs((result.cardHeight * 3 + 90) * scale + headingHeight - available) < 0.001, 'cards fill all remaining space without exceeding navigation')
  assert.strictEqual(result.contentHeight, available)
}
const small = homeLayout({ windowWidth: 320, availableHeight: 260, headingHeight: 70 })
assert.strictEqual(small.cardHeight, 200, 'tiny viewport must scroll instead of overlapping text')
assert.ok((small.cardHeight * 3 + 90) * 320 / 750 + 70 > 260)
assert.strictEqual(homeFocus('sport'), 0, 'sports crop must preserve the top containing heads')
assert.strictEqual(homeFocus('food'), 0.5)
assert.strictEqual(homeFocus('forum'), 0.85)
const page = { data: { entries: ['sport', 'food', 'forum'].map((id) => ({ id, route: id })) }, setData(update) { Object.assign(this.data, update) } }
applyHomeLayout(page, { windowWidth: 375 }, 440, 57.5)
assert.strictEqual(page.data.homeContentHeight, 440)
assert.ok(page.data.entries[0].imageStyle.includes('top: 0rpx'))
assert.strictEqual(page.data.entries[1].route, 'food')
const query = { in() { return this }, select() { return this }, boundingClientRect() { return this }, exec(callback) { callback([{ top: 88 }, { height: 58 }, { top: 600 }]) } }
global.wx = { getWindowInfo: () => ({ windowWidth: 375 }), createSelectorQuery: () => query }
updateHomeLayout(page)
assert.strictEqual(page.data.homeScrollHeight, 512)
assert.strictEqual(page.data.homeContentHeight, 512)
page.homeDisposed = true
page.data.homeScrollHeight = 1
updateHomeLayout(page)
assert.strictEqual(page.data.homeScrollHeight, 1)
delete global.wx

const tall = homeLayout({ windowWidth: 390, availableHeight: 650, headingHeight: 60 })
const taller = homeLayout({ windowWidth: 390, availableHeight: 750, headingHeight: 60 })
assert.ok(tall.cardHeight > 230)
assert.ok(taller.cardHeight > tall.cardHeight)
assert.ok(taller.imageHeight >= taller.cardHeight, 'tall cards must have full image coverage')
const fs = require('fs')
const style = fs.readFileSync('pages/community/community.wxss', 'utf8')
for (const selector of ['entry-list', 'entry-card']) assert.ok(style.match(new RegExp('\\.' + selector + ' \\{([^}]+)\\}'))[1].includes('flex: 1'))
assert.ok(!fs.readFileSync('pages/community/community.wxml', 'utf8').includes('entryCardHeight'))

// 各尺寸采用模拟的导航边界验证，不冒充模拟器或真机测量。
for (const [width, height, top, bottomInset] of [[320, 568, 64, 0], [375, 667, 64, 0], [390, 844, 91, 34], [360, 800, 80, 24], [430, 932, 103, 34]]) {
  const scale = width / 750
  const navigationTop = height - 91 * scale - bottomInset
  const availableHeight = navigationTop - top
  const headingHeight = 115 * scale
  const layout = homeLayout({ windowWidth: width, availableHeight, headingHeight })
  const forumBottom = top + 18 * scale + headingHeight + 18 * scale + 3 * layout.cardHeight * scale + 36 * scale
  assert.ok(Math.abs(navigationTop - forumBottom - 18 * scale) < 0.001)
  assert.strictEqual(layout.contentHeight, availableHeight)
  console.log(`${width}x${height}: card=${layout.cardHeight.toFixed(2)}rpx, bottom gap=18rpx, no overflow`)
}
console.log('Community measured viewport, full-space flex, tiny screen overflow, focus and disposal tests passed.')
