const assert = require('assert')
const fs = require('fs')
const { generate } = require('../cloudfunctions/trainingPlan/plan-generator')
const { validateConfiguration, exerciseLibrary, trainingTemplates } = require('../cloudfunctions/trainingPlan/executable-training')
const { buildTodayPlanDisplayModel } = require('../constants/today-plan')

const reported = (value) => ({ value, source: 'user_reported' })
const safetyScreening = Object.assign(Object.fromEntries(['painOrInjuryStatus', 'postSurgeryOrRehabStatus', 'doctorRestrictionStatus', 'specialPhysicalStatus', 'medicalPurposeStatus', 'eatingConcernStatus'].map((field) => [field, 'none'])), { safetyAcknowledged: true, safetyScreeningVersion: 'safety-screening-v1' })

function fixture({ goal = 'fitness_improvement', days = 3, minutes = 45, experience = 'beginner', equipment = 'bodyweight', preferences = ['running'], safety = safetyScreening } = {}) {
  const profile = { gender: 'female', birthDate: '2000-01-01', heightCm: 170, weightKg: 60, targetWeightKg: goal === 'fat_loss' ? 55 : goal === 'weight_gain' ? 65 : null, activityLevel: 'light' }
  const portrait = { status: 'complete', profileVersion: 2, portraitVersion: 4, campus: reported('xueyuan_road'), trainingGoal: reported(goal), trainingConditions: { availableDaysPerWeek: reported(days), sessionDurationMinutes: reported(minutes), experienceLevel: reported(experience), equipmentAccess: reported(equipment), exercisePreferences: reported(preferences) }, safetyConditions: { exerciseLimitationStatus: reported('none') }, safetyScreening: safety }
  return { profile, profileVersion: 2, portrait, now: new Date('2026-09-01T00:00:00.000Z'), planId: 'plan-test', requestId: 'request-test' }
}

async function expectCode(input, code) {
  let actual
  try { await generate(input) } catch (error) { actual = error.code }
  assert.strictEqual(actual, code)
}

async function run() {
  assert.strictEqual(validateConfiguration(), true)
  const actionIds = new Set(exerciseLibrary.records.map((item) => item.exerciseId))
  assert.strictEqual(actionIds.size, exerciseLibrary.records.length)
  for (const action of exerciseLibrary.records) {
    assert.ok(action.substituteExerciseIds.length > 0)
    action.substituteExerciseIds.forEach((id) => assert.ok(actionIds.has(id) && id !== action.exerciseId))
  }
  for (const duration of trainingTemplates.durationProfiles) assert.strictEqual(duration.warmupMinutes + duration.mainMinutes + duration.aerobicMinutes + duration.cooldownMinutes + duration.transitionMinutes, duration.totalMinutes)

  const goals = ['fat_loss', 'muscle_gain', 'weight_gain', 'maintain', 'fitness_improvement']
  const scenes = [
    { equipment: 'gym', preferences: ['strength'] },
    { equipment: 'bodyweight', preferences: ['mobility'] },
    { equipment: 'bodyweight', preferences: ['running'] }
  ]
  let combinations = 0
  for (const goal of goals) for (const days of [2, 3, 4]) for (const minutes of [30, 45, 60]) for (const experience of ['beginner', 'experienced']) for (const scene of scenes) {
    const input = fixture({ goal, days, minutes, experience, ...scene })
    const output = await generate(input)
    combinations += 1
    assert.strictEqual(output.cycle.weeks.length, 4)
    assert.strictEqual(output.exerciseLibraryVersion, exerciseLibrary.dataVersion)
    assert.strictEqual(output.templateVersion, trainingTemplates.dataVersion)
    const trainingDays = output.dailyPlans.filter((day) => day.dayType === 'training')
    assert.strictEqual(trainingDays.length, 4 * days)
    for (const day of trainingDays) {
      const exercise = day.plannedExercise
      assert.ok(exercise.theme && exercise.trainingDayLabel && exercise.safetyNotices.length)
      assert.strictEqual(exercise.items.reduce((sum, item) => sum + item.durationMinutes, 0) + exercise.transitionMinutes, minutes)
      for (const item of exercise.items) {
        assert.ok(actionIds.has(item.exerciseId))
        assert.ok(item.substituteExerciseIds.length)
        assert.ok(item.substituteExerciseIds.every((id) => actionIds.has(id)))
        assert.ok(Number.isFinite(item.restSeconds))
      }
    }
    const repeated = await generate(input)
    assert.deepStrictEqual(output, repeated)
  }
  assert.strictEqual(combinations, 270)

  const fixedFatLoss = await generate(fixture({ goal: 'fat_loss', days: 3, minutes: 60, experience: 'beginner', equipment: 'gym', preferences: ['walking', 'strength'] }))
  for (const week of fixedFatLoss.cycle.weeks) {
    const days = fixedFatLoss.dailyPlans.filter((day) => day.weekIndex === week.weekNumber && day.dayType === 'training')
    assert.strictEqual(days.length, 3)
    assert.strictEqual(new Set(days.map((day) => day.plannedExercise.theme)).size, 3, '三个训练日主题不能完全相同')
    days.forEach((day) => {
      const exercise = day.plannedExercise
      assert.ok(exercise.warmup && exercise.warmup.durationMinutes > 0)
      assert.ok(exercise.mainExercises.length > 0)
      assert.ok(exercise.mainExercises.every((item) => item.sets > 0 && (item.reps > 0 || item.setDurationSeconds > 0) && Number.isFinite(item.restSeconds)))
      assert.ok(exercise.aerobic && Number.isFinite(exercise.aerobic.durationMinutes) && exercise.aerobic.intensityDescription)
      assert.ok(exercise.cooldown && exercise.cooldown.durationMinutes > 0)
      assert.strictEqual(exercise.totalDurationMinutes, 60)
    })
  }

  const legacy = await generate(fixture({ goal: 'weight_gain' }))
  assert.strictEqual(legacy.profileSnapshot.normalizedGoal, 'healthy_weight_gain')
  assert.strictEqual((await generate(fixture({ goal: 'maintain' }))).profileSnapshot.normalizedGoal, 'maintain_status')
  assert.strictEqual((await generate(fixture({ goal: 'fitness_improvement' }))).profileSnapshot.normalizedGoal, 'stamina_improvement')
  await expectCode(fixture({ goal: 'unknown' }), 'TRAINING_GOAL_UNSUPPORTED')
  await expectCode(fixture({ days: 5 }), 'TRAINING_FREQUENCY_UNSUPPORTED')
  await expectCode(fixture({ minutes: 20 }), 'TRAINING_DURATION_UNSUPPORTED')
  await expectCode(fixture({ experience: 'unknown' }), 'TRAINING_EXPERIENCE_UNSUPPORTED')
  await expectCode(fixture({ safety: { ...safetyScreening, painOrInjuryStatus: 'present' } }), 'PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE')

  const output = await generate(fixture())
  assert.ok(output.dailyPlans.every((day) => day.plannedExercise.recommendedLocation === '暂无已核实地点'))
  assert.ok(output.dailyPlans.every((day) => day.resourceMatches.venues.length === 0))
  const today = output.dailyPlans.find((day) => day.dayType === 'training')
  const display = buildTodayPlanDisplayModel({ ...today, planId: output.planId }, null)
  assert.ok(display.plannedExercise.items.every((item) => 'restText' in item && 'substituteText' in item && 'safetyText' in item))

  const indexSource = fs.readFileSync('cloudfunctions/trainingPlan/index.js', 'utf8')
  assert.ok(indexSource.includes('currentPlanId: planId'))
  assert.ok(indexSource.includes('status: PLAN_STATUS.ARCHIVED'))
  assert.ok(indexSource.includes('markGenerationFailed'))
  assert.ok(indexSource.includes('画像版本变化本身不等于方案失效'))
  const myPlanWxml = fs.readFileSync('pages/my-plan/my-plan.wxml', 'utf8')
  const cultivationWxml = fs.readFileSync('pages/cultivation/cultivation.wxml', 'utf8')
  assert.ok(myPlanWxml.includes('训练模板版本') && myPlanWxml.includes('点击卡片查看本周简要安排'))
  assert.ok(cultivationWxml.includes('item.restText') && cultivationWxml.includes('替代：') && cultivationWxml.includes('安全提示'))
  console.log(`Executable training rules passed: ${combinations} combinations and fixed fat-loss 3-day/60-minute fixture.`)
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
