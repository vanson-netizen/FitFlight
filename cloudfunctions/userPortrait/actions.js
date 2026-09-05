// 云函数独立部署，需在契约测试中与小程序端的同名常量保持一致。
const USER_PORTRAIT_ACTIONS = Object.freeze({
  GET: 'getPortrait',
  SAVE: 'savePortrait',
  SAVE_SAFETY_SCREENING: 'saveSafetyScreening'
})

module.exports = { USER_PORTRAIT_ACTIONS }
