const MAIN_PAGE_TITLE = 'FitFlight'
// app.json 未注册原生 tabBar，四个主页使用页面内自绘底栏。
const HOME_NAVIGATION_METHOD = 'reLaunch'
const HOME_ROUTES = {
  mine: '/pages/index/index',
  fifi: '/pages/fifi/fifi',
  cultivation: '/pages/cultivation/cultivation',
  community: '/pages/community/community'
}

const PAGE_HOME = {}
const groups = {
  mine: ['my-portrait', 'my-plan', 'achievements', 'settings', 'data-usage', 'about', 'portrait-editor', 'body-profile'],
  community: ['community-sport', 'community-food', 'community-forum'],
  cultivation: ['journal-notebooks', 'journal-entries', 'journal-editor', 'health-records', 'health-record-editor', 'health-trends', 'safety-screening']
}
Object.keys(groups).forEach(group => {
  groups[group].forEach(page => { PAGE_HOME[`pages/${page}/${page}`] = HOME_ROUTES[group] })
})

module.exports = { MAIN_PAGE_TITLE, HOME_NAVIGATION_METHOD, HOME_ROUTES, PAGE_HOME }
