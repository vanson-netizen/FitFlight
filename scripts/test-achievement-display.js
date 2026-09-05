const assert = require('assert')
const fs = require('fs')
const { ACHIEVEMENT_CONFIG } = require('../constants/fifi')
assert.deepStrictEqual(ACHIEVEMENT_CONFIG.map((item) => item.key), ['first_meeting', 'streak_3', 'streak_7', 'perfect_day', 'active_partner'])
assert(ACHIEVEMENT_CONFIG.every((item) => !Object.hasOwn(item, 'iconPath')))
for (const page of ['index', 'achievements']) {
  const wxml = fs.readFileSync(`pages/${page}/${page}.wxml`, 'utf8')
  const js = fs.readFileSync(`pages/${page}/${page}.js`, 'utf8')
  const css = fs.readFileSync(`pages/${page}/${page}.wxss`, 'utf8')
  assert(wxml.includes('class="achievement-check"'))
  assert(!/iconHidden|onAchievementImageError|item.iconPath|selectedAchievement.iconPath/.test(wxml + js))
  assert(css.includes('border-radius: 50%'))
  assert(css.includes('background: #668f42'))
}
const css = fs.readFileSync('pages/achievements/achievements.wxss', 'utf8')
assert(css.includes('.achievement-card-locked .grid-icon { background: #bdcdb1; }'))
assert(css.includes('.detail-icon.detail-icon-locked { background: #bdcdb1; }'))
global.Page = () => {}
const { buildHomeAchievementSlots } = require('../pages/index/index')
assert.deepStrictEqual(buildHomeAchievementSlots([]), [])
const rows = [{ key: 'streak_7', unlocked: false }, { key: 'perfect_day', achievedAt: '2026-09-05' }, { key: 'first_meeting', achievedAt: '2026-09-04' }, { key: 'streak_3' }]
assert.deepStrictEqual(buildHomeAchievementSlots(rows).map((item) => [item.key, item.achievedAt]), [['perfect_day', '2026-09-05'], ['first_meeting', '2026-09-04']])
console.log('achievement circle display, locked styles and latest two ordering passed')
