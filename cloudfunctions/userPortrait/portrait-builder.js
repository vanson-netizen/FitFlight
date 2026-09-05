const { calculateMetrics } = require('./metrics')
const { PORTRAIT_RULE_VERSION, CHANGE_POLICY_VERSION } = require('./portrait-config')

function reported(value) { return { value, source: 'user_reported' } }

function buildStoredPortrait(input, profile, profileVersion, portraitVersion, now) {
  return {
    portraitVersion,
    portraitRuleVersion: PORTRAIT_RULE_VERSION,
    changePolicyVersion: CHANGE_POLICY_VERSION,
    profileVersion,
    status: 'complete',
    campus: reported(input.campus),
    calculatedMetrics: calculateMetrics(profile),
    trainingGoal: reported(input.trainingGoal),
    trainingConditions: {
      availableDaysPerWeek: reported(input.trainingConditions.availableDaysPerWeek),
      sessionDurationMinutes: reported(input.trainingConditions.sessionDurationMinutes),
      experienceLevel: reported(input.trainingConditions.experienceLevel),
      equipmentAccess: reported(input.trainingConditions.equipmentAccess),
      exercisePreferences: reported(input.trainingConditions.exercisePreferences)
    },
    safetyConditions: { exerciseLimitationStatus: reported(input.safetyConditions.exerciseLimitationStatus) },
    changeBaseline: { weightKg: profile.weightKg, targetWeightKg: profile.targetWeightKg === undefined ? null : profile.targetWeightKg },
    generatedAt: now,
    updatedAt: now
  }
}

function resolvePortraitStatus(portrait, profileVersion) {
  if (!portrait) return 'not_generated'
  return portrait.profileVersion === profileVersion ? 'complete' : 'needs_regeneration'
}

module.exports = { buildStoredPortrait, resolvePortraitStatus }
