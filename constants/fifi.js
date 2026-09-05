const EXERCISE_STATUS = Object.freeze({
  COMPLETED: 'completed',
  SCHEDULED_REST: 'scheduled_rest',
  USER_PAUSED: 'user_paused',
  PENDING: 'pending'
})

const FIFI_POINTS = Object.freeze({ exercise: 3, diet: 2, sleep: 2, allCompleteBonus: 3, dailyMaximum: 10 })

const FIFI_STAGES = Object.freeze([
  { key: 'encounter', name: '相遇', min: 0, max: 20 },
  { key: 'familiar', name: '熟悉', min: 21, max: 50 },
  { key: 'partner', name: '伙伴', min: 51, max: 89 },
  { key: 'active_partner', name: '活力搭档', min: 90, max: null }
])

const FIFI_IMAGES = Object.freeze({
  normal: '/assets/fifi/fifi-normal.svg',
  happy: '/assets/fifi/fifi-happy.svg',
  celebrate: '/assets/fifi/fifi-celebrate.svg'
})

const FIFI_DIALOGUES = Object.freeze({
  normal: ['今天也一起慢慢来吧。', '去看看今天的培养任务吧。'],
  happy: ['已经迈出一步啦！', '今天的努力我看见了。'],
  celebrate: ['今天三项都完成啦，太棒了！', '我们又一起成长了一点！']
})

const FIFI_PAGE_STATUS = Object.freeze({ LOADING: 'loading', EMPTY: 'empty', ERROR: 'error', SUCCESS: 'success' })

const ACHIEVEMENT_CONFIG = Object.freeze([
  Object.freeze({ key: 'first_meeting', name: '初次相遇', condition: '完成任意一项培养任务', type: 'cultivation_days', threshold: 1 }),
  Object.freeze({ key: 'streak_3', name: '连续3天', condition: '连续3天完成至少一项培养任务', type: 'streak', threshold: 3 }),
  Object.freeze({ key: 'streak_7', name: '连续7天', condition: '连续7天完成至少一项培养任务', type: 'streak', threshold: 7 }),
  Object.freeze({ key: 'perfect_day', name: '今日满分', condition: '同一天完成锻炼、饮食和作息', type: 'daily_points', threshold: FIFI_POINTS.dailyMaximum }),
  Object.freeze({ key: 'active_partner', name: '活力搭档', condition: '累计获得90点成长值', type: 'total_points', threshold: FIFI_STAGES[3].min })
])

module.exports = { EXERCISE_STATUS, FIFI_POINTS, FIFI_STAGES, FIFI_IMAGES, FIFI_DIALOGUES, FIFI_PAGE_STATUS, ACHIEVEMENT_CONFIG }
