function roundMetric(value) {
  return Math.round(value * 10) / 10
}

function calculateMetrics(profile) {
  const heightMeters = Number(profile.heightCm) / 100
  return {
    bmi: { value: roundMetric(Number(profile.weightKg) / (heightMeters * heightMeters)), source: 'calculated' },
    weightDifferenceKg: {
      value: profile.targetWeightKg === null || profile.targetWeightKg === undefined
        ? null
        : roundMetric(Number(profile.targetWeightKg) - Number(profile.weightKg)),
      source: 'calculated'
    }
  }
}

module.exports = { calculateMetrics }
