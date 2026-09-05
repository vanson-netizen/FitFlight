function validateSafetyForm(questions, answers, safetyAcknowledged) {
  if (questions.some(({ field }) => !answers[field])) return '请完成每一项选择'
  if (!safetyAcknowledged) return '请勾选确认后再保存'
  return ''
}

function buildSavedAnswers(questions, screening = {}) {
  return questions.reduce((answers, { field }) => {
    answers[field] = screening[field] || ''
    return answers
  }, {})
}

module.exports = { validateSafetyForm, buildSavedAnswers }
