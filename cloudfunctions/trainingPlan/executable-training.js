const exerciseLibrary = require('./9.FitFlight_V1_Exercise_Library.json')
const trainingTemplates = require('./10.FitFlight_V1_Training_Templates.json')

const GOAL_MAP = Object.freeze({
  fat_loss: 'fat_loss',
  muscle_gain: 'muscle_gain',
  weight_gain: 'healthy_weight_gain',
  maintain: 'maintain_status',
  fitness_improvement: 'stamina_improvement'
})
const EXPERIENCE_MAP = Object.freeze({ none: 'beginner', beginner: 'beginner', experienced: 'experienced' })
const INTENSITY_TEXT = Object.freeze(exerciseLibrary.intensityDescriptions)
const PREFERENCE_ORDER = Object.freeze(['walking', 'running', 'cycling', 'strength', 'mobility', 'group_fitness', 'unsure'])

function configurationError(message) {
  return Object.assign(new Error(message), { code: 'TRAINING_RULE_CONFIG_INVALID' })
}

function inputError(code, message) {
  return Object.assign(new Error(message), { code })
}

function uniqueIndex(records, key, label) {
  const index = new Map()
  for (const record of records) {
    if (!record || typeof record[key] !== 'string' || index.has(record[key])) throw configurationError(`${label} ID 无效或重复`)
    index.set(record[key], record)
  }
  return index
}

const exerciseIndex = uniqueIndex(exerciseLibrary.records, 'exerciseId', '动作')
const sessionIndex = uniqueIndex(trainingTemplates.sessionTemplates, 'sessionId', '训练模板')
const durationIndex = uniqueIndex(trainingTemplates.durationProfiles, 'profileId', '时长模板')

function validateConfiguration() {
  if (trainingTemplates.exerciseLibraryVersion !== exerciseLibrary.dataVersion) throw configurationError('训练模板与动作库版本不匹配')
  for (const exercise of exerciseLibrary.records) {
    if (!Array.isArray(exercise.substituteExerciseIds) || exercise.substituteExerciseIds.length === 0) throw configurationError(`动作 ${exercise.exerciseId} 缺少替代动作`)
    for (const substituteId of exercise.substituteExerciseIds) {
      if (substituteId === exercise.exerciseId || !exerciseIndex.has(substituteId)) throw configurationError(`动作 ${exercise.exerciseId} 的替代引用无效`)
    }
  }
  for (const duration of trainingTemplates.durationProfiles) {
    const actual = duration.warmupMinutes + duration.mainMinutes + duration.aerobicMinutes + duration.cooldownMinutes + duration.transitionMinutes
    if (actual !== duration.totalMinutes) throw configurationError(`时长模板 ${duration.profileId} 合计不正确`)
  }
  for (const [goal, patterns] of Object.entries(trainingTemplates.dayPatterns)) {
    for (const days of trainingTemplates.supportedInputs.daysPerWeek) {
      const sessions = patterns[String(days)]
      if (!Array.isArray(sessions) || sessions.length !== days || sessions.some((id) => !sessionIndex.has(id))) throw configurationError(`目标 ${goal} 的 ${days} 天模板无效`)
    }
  }
  for (const session of trainingTemplates.sessionTemplates) {
    const references = [session.warmupExerciseId, session.cooldownExerciseId]
    for (const slot of session.mainSlots) Object.values(slot.exerciseIdsByScene).forEach((ids) => references.push(...ids))
    Object.values(session.aerobicExerciseIdsByPreference).forEach((ids) => references.push(...ids))
    if (references.some((id) => !exerciseIndex.has(id))) throw configurationError(`训练模板 ${session.sessionId} 引用了不存在的动作`)
  }
  return true
}

validateConfiguration()

function normalizePreferences(preferences) {
  const values = Array.isArray(preferences) ? [...new Set(preferences)] : []
  return PREFERENCE_ORDER.filter((preference) => values.includes(preference))
}

function normalizeInput({ goal, daysPerWeek, sessionDurationMinutes, experienceLevel, equipmentAccess, exercisePreferences }) {
  const normalizedGoal = GOAL_MAP[goal]
  if (!normalizedGoal) throw inputError('TRAINING_GOAL_UNSUPPORTED', '当前培养目标没有可执行训练模板')
  if (!trainingTemplates.supportedInputs.daysPerWeek.includes(daysPerWeek)) throw inputError('TRAINING_FREQUENCY_UNSUPPORTED', '可执行训练方案仅支持每周 2、3 或 4 天')
  if (!trainingTemplates.supportedInputs.sessionDurationMinutes.includes(sessionDurationMinutes)) throw inputError('TRAINING_DURATION_UNSUPPORTED', '可执行训练方案仅支持每次 30、45 或 60 分钟')
  const normalizedExperience = EXPERIENCE_MAP[experienceLevel]
  if (!normalizedExperience) throw inputError('TRAINING_EXPERIENCE_UNSUPPORTED', '训练经验选项不受支持')
  if (!['bodyweight', 'basic_equipment', 'gym'].includes(equipmentAccess)) throw inputError('TRAINING_EQUIPMENT_UNSUPPORTED', '器材条件选项不受支持')
  const preferences = normalizePreferences(exercisePreferences)
  if (!preferences.length) throw inputError('TRAINING_PREFERENCES_INVALID', '运动偏好信息不完整')
  const scene = equipmentAccess === 'gym'
    ? 'gym'
    : preferences.some((item) => item === 'walking' || item === 'running' || item === 'cycling')
      ? 'outdoor_track'
      : 'dorm_bodyweight'
  return { goal, normalizedGoal, daysPerWeek, sessionDurationMinutes, experienceLevel: normalizedExperience, equipmentAccess, exercisePreferences: preferences, scene }
}

function durationProfile(session, input) {
  const override = trainingTemplates.roleOverridesByGoal[input.normalizedGoal] || {}
  const role = override[session.role] || session.role
  const profile = durationIndex.get(`${role}_${input.sessionDurationMinutes}`)
  if (!profile) throw inputError('TRAINING_TEMPLATE_NOT_FOUND', '没有匹配当前目标和时长的训练模板')
  return { ...profile }
}

function equipmentCompatible(exercise, equipmentAccess) {
  if (equipmentAccess === 'gym') return true
  const unavailableWithoutGym = ['leg_press_machine', 'chest_press_machine', 'seated_row_machine', 'lat_pulldown_machine', 'leg_curl_machine', 'stationary_bike']
  if (exercise.equipment.some((item) => unavailableWithoutGym.includes(item))) return false
  if (equipmentAccess === 'bodyweight' && exercise.equipment.some((item) => ['resistance_band', 'secure_anchor'].includes(item))) return false
  return true
}

function firstExercise(ids, scene, experienceLevel, equipmentAccess) {
  for (const id of ids || []) {
    const exercise = exerciseIndex.get(id)
    if (exercise && exercise.scenes.includes(scene) && exercise.experienceLevels.includes(experienceLevel) && equipmentCompatible(exercise, equipmentAccess)) return exercise
  }
  return null
}

function resolveSlot(slot, scene, experienceLevel, equipmentAccess) {
  const direct = firstExercise(slot.exerciseIdsByScene[scene], scene, experienceLevel, equipmentAccess)
  if (direct) return direct
  const candidates = Object.values(slot.exerciseIdsByScene).flat()
  for (const candidateId of candidates) {
    const candidate = exerciseIndex.get(candidateId)
    const substitute = candidate && firstExercise(candidate.substituteExerciseIds, scene, experienceLevel, equipmentAccess)
    if (substitute) return substitute
  }
  throw inputError('TRAINING_EXERCISE_NOT_AVAILABLE', `训练模块 ${slot.slot} 没有适合当前场景的动作`)
}

function distributeMinutes(total, count) {
  if (!count) return []
  const base = Math.floor(total / count)
  return Array.from({ length: count }, (_, index) => base + (index < total % count ? 1 : 0))
}

function exerciseItem(exercise, itemId, section, budgetMinutes, progression = null) {
  const defaults = exercise.defaults
  let sets = defaults.sets
  let reps = defaults.reps
  let durationSeconds = defaults.durationSeconds
  if (progression && progression.type === 'add_set') sets = Math.min(exercise.limits.maxSets, sets + progression.amount)
  if (progression && progression.type === 'add_reps' && Number.isFinite(reps)) reps = Math.min(exercise.limits.maxReps, reps + progression.amount)
  return {
    itemId,
    section,
    exerciseId: exercise.exerciseId,
    title: exercise.name,
    durationMinutes: budgetMinutes,
    budgetMinutes,
    sets,
    reps,
    setDurationSeconds: reps === null ? durationSeconds : null,
    restSeconds: defaults.restSeconds,
    description: reps !== null ? `${sets} 组 × ${reps} 次，组间休息 ${defaults.restSeconds} 秒` : durationSeconds !== null ? `${sets} 组 × ${durationSeconds} 秒，组间休息 ${defaults.restSeconds} 秒` : `安排 ${budgetMinutes} 分钟`,
    substituteExerciseIds: [...exercise.substituteExerciseIds],
    substitutes: exercise.substituteExerciseIds.map((id) => ({ exerciseId: id, name: exerciseIndex.get(id).name })),
    safetyNotices: [...exercise.safetyNotices]
  }
}

function selectAerobic(session, preferences, scene, experienceLevel, equipmentAccess) {
  const preference = preferences.find((item) => session.aerobicExerciseIdsByPreference[item]) || 'default'
  const preferred = firstExercise(session.aerobicExerciseIdsByPreference[preference], scene, experienceLevel, equipmentAccess)
  const fallback = preferred || firstExercise(session.aerobicExerciseIdsByPreference.default, scene, experienceLevel, equipmentAccess)
  if (!fallback) throw inputError('TRAINING_EXERCISE_NOT_AVAILABLE', '没有适合当前场景的有氧动作')
  return fallback
}

function buildTrainingDay(input, trainingDayIndex, weekNumber) {
  const sessionId = trainingTemplates.dayPatterns[input.normalizedGoal][String(input.daysPerWeek)][trainingDayIndex - 1]
  const session = sessionIndex.get(sessionId)
  if (!session) throw inputError('TRAINING_TEMPLATE_NOT_FOUND', '训练日模板不存在')
  const duration = durationProfile(session, input)
  const isProgressWeek = weekNumber === 3
  let progression = isProgressWeek ? session.week3Progression : null
  if (progression && progression.type === 'add_aerobic_minutes') {
    if (duration.mainMinutes - progression.amount < progression.minimumRemainingMainMinutes) progression = null
    else {
      duration.mainMinutes -= progression.amount
      duration.aerobicMinutes += progression.amount
    }
  }
  const warmup = exerciseIndex.get(session.warmupExerciseId)
  const cooldown = exerciseIndex.get(session.cooldownExerciseId)
  const slotExercises = session.mainSlots.map((slot) => ({ slot: slot.slot, exercise: resolveSlot(slot, input.scene, input.experienceLevel, input.equipmentAccess) }))
  const budgets = distributeMinutes(duration.mainMinutes, slotExercises.length)
  const mainExercises = slotExercises.map(({ slot, exercise }, index) => {
    const applies = progression && progression.exerciseSlot === slot ? progression : null
    return exerciseItem(exercise, `w${weekNumber}-t${trainingDayIndex}-main-${index + 1}`, 'main', budgets[index], applies)
  })
  const aerobicExercise = selectAerobic(session, input.exercisePreferences, input.scene, input.experienceLevel, input.equipmentAccess)
  const intensityCode = (trainingTemplates.roleOverridesByGoal[input.normalizedGoal] || {}).aerobicIntensity || session.aerobicIntensity
  const aerobic = exerciseItem(aerobicExercise, `w${weekNumber}-t${trainingDayIndex}-aerobic`, 'aerobic', duration.aerobicMinutes)
  Object.assign(aerobic, { intensityCode, intensityDescription: INTENSITY_TEXT[intensityCode] })
  const warmupItem = exerciseItem(warmup, `w${weekNumber}-t${trainingDayIndex}-warmup`, 'warmup', duration.warmupMinutes)
  const cooldownItem = exerciseItem(cooldown, `w${weekNumber}-t${trainingDayIndex}-cooldown`, 'cooldown', duration.cooldownMinutes)
  const total = duration.warmupMinutes + duration.mainMinutes + duration.aerobicMinutes + duration.cooldownMinutes + duration.transitionMinutes
  if (total !== input.sessionDurationMinutes) throw configurationError(`模板 ${sessionId} 的总时长不正确`)
  const items = [warmupItem, ...mainExercises, aerobic, cooldownItem]
  return {
    trainingDayIndex,
    trainingDayLabel: `第${trainingDayIndex}训练日`,
    sessionId,
    theme: session.theme,
    recommendedScene: input.scene,
    recommendedSceneText: input.scene === 'gym' ? '健身房' : input.scene === 'outdoor_track' ? '操场或户外' : '宿舍徒手',
    warmup: { exerciseId: warmup.exerciseId, name: warmup.name, durationMinutes: duration.warmupMinutes },
    mainExercises,
    aerobic,
    cooldown: { exerciseId: cooldown.exerciseId, name: cooldown.name, durationMinutes: duration.cooldownMinutes },
    transitionMinutes: duration.transitionMinutes,
    totalDurationMinutes: total,
    intensity: INTENSITY_TEXT[intensityCode],
    intensityCode,
    intensityDescription: INTENSITY_TEXT[intensityCode],
    progression: progression || { type: 'hold' },
    items,
    safetyNotices: [...new Set([trainingTemplates.globalSafetyNotice, ...session.safetyNotices, ...items.flatMap((item) => item.safetyNotices)])]
  }
}

function buildWeeklyTraining(input, weekNumber) {
  return Array.from({ length: input.daysPerWeek }, (_, index) => buildTrainingDay(input, index + 1, weekNumber))
}

module.exports = {
  EXERCISE_LIBRARY_VERSION: exerciseLibrary.dataVersion,
  TEMPLATE_VERSION: trainingTemplates.dataVersion,
  GOAL_MAP,
  validateConfiguration,
  normalizeInput,
  buildTrainingDay,
  buildWeeklyTraining,
  exerciseLibrary,
  trainingTemplates
}
