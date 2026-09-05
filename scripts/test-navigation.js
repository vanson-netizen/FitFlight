const assert = require('assert')
const fs = require('fs')
const path = require('path')
const app = require('../app.json')
const { PAGE_HOME, HOME_ROUTES, MAIN_PAGE_TITLE, HOME_NAVIGATION_METHOD } = require('../constants/navigation')
const { safeNavigateBack } = require('../utils/navigation')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
let pages, calls, backFailure, homeFailure
global.getCurrentPages = () => pages
global.wx = {
  navigateBack(options) { calls.push(['back', options.delta]); if (backFailure) options.fail({ errMsg: backFailure }) },
  reLaunch(options) { calls.push(['home', options.url]); if (homeFailure) options.fail({ errMsg: 'failed' }) },
  switchTab(options) { calls.push(['tab', options.url]) },
  showToast(options) { calls.push(['toast', options.icon]) }
}
function reset(route, stack = false) {
  pages = [...(stack ? [{ route: 'pages/index/index' }] : []), { route }]
  calls = []; backFailure = ''; homeFailure = false
}
assert.strictEqual(Object.keys(PAGE_HOME).length, 18)
for (const [route, home] of Object.entries(PAGE_HOME)) {
  assert(app.pages.includes(route) && app.pages.includes(home.slice(1)))
  reset(route); safeNavigateBack(); assert.deepStrictEqual(calls, [['home', home]])
  reset(route, true); safeNavigateBack(); assert.deepStrictEqual(calls, [['back', 1]])
  const wxml = read(`${route}.wxml`)
  assert(wxml.includes('<navigation-bar title='), route)
  assert(!wxml.includes('main-page='), route)
}
reset('pages/my-portrait/my-portrait', true)
backFailure = 'navigateBack:fail'; safeNavigateBack()
assert.deepStrictEqual(calls, [['back', 1], ['home', HOME_ROUTES.mine]])
reset('pages/journal-editor/journal-editor', true)
backFailure = 'navigateBack:fail cancel'; safeNavigateBack()
assert.deepStrictEqual(calls, [['back', 1]])
reset('pages/my-portrait/my-portrait'); homeFailure = true
const warn = console.warn; console.warn = () => {}
safeNavigateBack(); console.warn = warn
assert.deepStrictEqual(calls, [['home', HOME_ROUTES.mine], ['toast', 'none']])
assert.strictEqual(HOME_NAVIGATION_METHOD, app.tabBar ? 'switchTab' : 'reLaunch', 'Home navigation must match app.json registration')
assert.strictEqual(MAIN_PAGE_TITLE, 'FitFlight')
for (const route of Object.values(HOME_ROUTES)) {
  const wxml = read(`${route.slice(1)}.wxml`)
  assert(wxml.includes('main-page="{{true}}" back="{{false}}" color="#25352b" background="#dff3b7"'))
}
let component
global.Component = value => { component = value }
require('../components/navigation-bar/navigation-bar')
reset('pages/my-portrait/my-portrait')
component.methods.back.call({ data: { delta: 1 }, triggerEvent() {} })
assert.deepStrictEqual(calls, [['home', HOME_ROUTES.mine]])
const css = read('components/navigation-bar/navigation-bar.wxss')
assert(css.includes('width: 80rpx;') && css.includes('height: 100%;'))
assert(!css.includes('margin: -11px'))
assert(read('components/navigation-bar/navigation-bar.wxml').includes('bindtap="back"'))
let editor
global.Page = value => { editor = value }
require('../pages/journal-editor/journal-editor')
let confirm = false, prompted = 0
Object.assign(global.wx, {
  showModal(options) { prompted++; options.success({ confirm }) },
  removeStorageSync() {}, disableAlertBeforeUnload() {}
})
reset('pages/journal-editor/journal-editor')
editor.handleBack.call({ data: { dirty: true, notebookId: 'test' }, draftStorageId: 'new' })
assert.strictEqual(prompted, 1); assert.deepStrictEqual(calls, [])
confirm = true
editor.handleBack.call({ data: { dirty: true, notebookId: 'test' }, draftStorageId: 'new' })
assert.deepStrictEqual(calls, [['home', HOME_ROUTES.cultivation]])
console.log('Navigation: 18 secondary routes, stack/fallback/failure/cancellation, component, titles and journal guard passed')
