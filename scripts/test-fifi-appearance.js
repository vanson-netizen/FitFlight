const assert = require('assert')
const fs = require('fs')
const { FIFI_APPEARANCE } = require('../constants/fifi-appearance')
const { buildAppearanceLayout } = require('../pages/fifi/appearance-layout')
const { buildModel } = require('../services/fifi-growth-service')
for (const image of [FIFI_APPEARANCE.petImage, FIFI_APPEARANCE.backgroundImage]) assert(fs.statSync('.' + image).size < 200000)
const png = fs.readFileSync('.' + FIFI_APPEARANCE.petImage)
assert.strictEqual(png[25], 6)
const audit = JSON.parse(fs.readFileSync('docs/fifi-image-audit.json', 'utf8').replace(/^\ufeff/, ''))
assert(audit.find((entry) => entry.file === 'samoyed.png').outputAlpha[4] > 0)
const wxml = fs.readFileSync('pages/fifi/fifi.wxml', 'utf8')
assert(!/task-dot|checkbox|radio|cultivation-button|fallback-ear/.test(wxml))
assert(wxml.includes('model.cultivationDays'))
assert(wxml.includes('bindtap="changeDialogue"'))
assert(wxml.includes('mode="aspectFit"'))
assert(wxml.includes('mode="aspectFill"'))
for (const state of ['loading', 'error', 'empty']) assert(wxml.includes(state))
for (const [width, height, top, safe] of [[320,568,64,0],[390,844,91,34],[412,915,80,24],[360,740,72,20]]) {
  const nav = 90 * width / 750 + safe + 1
  const scene = { width, height: height - top }
  const viewport = { height: scene.height - nav }
  const result = buildAppearanceLayout(scene, viewport, width)
  const bgWidth = Number(result.backgroundStyle.match(/width:([\d.]+)/)[1])
  const bgHeight = Number(result.backgroundStyle.match(/height:([\d.]+)/)[1])
  const heroHeight = Number(result.petAreaStyle.match(/height:([\d.]+)/)[1])
  assert(bgWidth >= scene.width && bgHeight >= scene.height)
  assert(Math.abs(bgWidth / bgHeight - 0.6) < 0.00001)
  assert(heroHeight >= 310 * width / 750 && heroHeight <= 560 * width / 750)
  console.log(`layout calculation ${width}x${height}: hero ${heroHeight.toFixed(1)}px, scroll ${viewport.height.toFixed(1)}px`)
}
let definition
global.Page = (page) => { definition = page }
require('../pages/fifi/fifi')
const service = require('../services/fifi-growth-service')
const originalLoad = service.loadFifiGrowthData
const page = { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update) } }
async function run() {
  try {
    for (const status of ['pending', 'user_paused', 'scheduled_rest', 'completed']) {
      const model = buildModel([{ date: '2026-09-05', exerciseStatus: status, dietCompleted: true }], '2026-09-05', 'success')
      service.loadFifiGrowthData = async () => model
      await page.loadGrowth()
      assert.strictEqual(page.data.model, model)
      assert.strictEqual(page.data.appearance.petImage, FIFI_APPEARANCE.petImage)
      assert.strictEqual(page.data.taskItems[0].dormant, status === 'user_paused')
      const before = page.data.dialogue
      page.changeDialogue()
      assert.notStrictEqual(page.data.dialogue, before)
    }
    service.loadFifiGrowthData = async () => buildModel([], '2026-09-05', 'empty')
    await page.loadGrowth()
    assert.strictEqual(page.data.pageStatus, 'empty')
    service.loadFifiGrowthData = async () => { throw new Error('offline') }
    await page.loadGrowth()
    assert.strictEqual(page.data.pageStatus, 'error')
    page.handleImageError()
    page.handleBackgroundError()
    assert(page.data.imageLoadError && page.data.backgroundLoadError)
    console.log('FIFI appearance, task presentation, dialogue, empty/error and layout checks passed')
  } finally { service.loadFifiGrowthData = originalLoad }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
