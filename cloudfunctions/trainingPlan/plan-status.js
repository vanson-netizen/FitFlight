const PLAN_STATUS = Object.freeze({
  NONE: 'none',
  PENDING_CONFIRMATION: 'pending_confirmation',
  GENERATING: 'generating',
  ACTIVE: 'active',
  OUTDATED: 'outdated',
  ARCHIVED: 'archived',
  GENERATION_FAILED: 'generation_failed',
  GENERATOR_NOT_CONFIGURED: 'generator_not_configured'
  ,SAFETY_PAUSED: 'safety_paused'
})

module.exports = { PLAN_STATUS }
