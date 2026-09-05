const { CHANGE_POLICY_VERSION, CHANGE_THRESHOLDS } = require('./portrait-config')

function valueOf(field) {
  return field && Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : undefined
}

function absoluteDifference(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) return left === right ? 0 : Infinity
  return Math.abs(Number(left) - Number(right))
}

function sameArray(left, right) {
  return JSON.stringify([...(left || [])].sort()) === JSON.stringify([...(right || [])].sort())
}

function evaluateMajorChange(previous, next, currentProfile) {
  if (!previous) return { majorChange: false, reasons: [], changePolicyVersion: CHANGE_POLICY_VERSION }
  const reasons = []
  const previousConditions = previous.trainingConditions || {}
  const previousSafety = previous.safetyConditions || {}
  const baseline = previous.changeBaseline || {}

  if (valueOf(previous.trainingGoal) !== next.trainingGoal) reasons.push('trainingGoal')
  if (valueOf(previousSafety.exerciseLimitationStatus) !== next.safetyConditions.exerciseLimitationStatus) reasons.push('exerciseLimitationStatus')

  const weightChange = absoluteDifference(baseline.weightKg, currentProfile.weightKg)
  if (weightChange >= CHANGE_THRESHOLDS.weightAbsoluteKg) reasons.push('weightKg')
  if (absoluteDifference(baseline.targetWeightKg, currentProfile.targetWeightKg) >= CHANGE_THRESHOLDS.targetWeightAbsoluteKg) reasons.push('targetWeightKg')
  if (valueOf(previousConditions.availableDaysPerWeek) !== next.trainingConditions.availableDaysPerWeek) reasons.push('availableDaysPerWeek')
  if (valueOf(previousConditions.sessionDurationMinutes) !== next.trainingConditions.sessionDurationMinutes) reasons.push('sessionDurationMinutes')
  if (valueOf(previousConditions.experienceLevel) !== next.trainingConditions.experienceLevel) reasons.push('experienceLevel')
  if (valueOf(previousConditions.equipmentAccess) !== next.trainingConditions.equipmentAccess) reasons.push('equipmentAccess')
  if (!sameArray(valueOf(previousConditions.exercisePreferences) || [], next.trainingConditions.exercisePreferences || [])) reasons.push('exercisePreferences')

  return { majorChange: reasons.length > 0, reasons, changePolicyVersion: CHANGE_POLICY_VERSION }
}

function shouldAskPlanAdjustment(hasCurrentPlan, majorChange) {
  return Boolean(hasCurrentPlan && majorChange)
}

module.exports = { evaluateMajorChange, shouldAskPlanAdjustment }
