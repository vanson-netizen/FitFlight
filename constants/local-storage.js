const SAFE_CACHE_EXACT_KEYS = Object.freeze([])
const SAFE_CACHE_KEY_PREFIXES = Object.freeze([
  'fitflight:journal-draft:v1:'
])

function isSafeCacheKey(key) {
  const value = String(key || '')
  return SAFE_CACHE_EXACT_KEYS.includes(value) || SAFE_CACHE_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))
}

module.exports = { SAFE_CACHE_EXACT_KEYS, SAFE_CACHE_KEY_PREFIXES, isSafeCacheKey }
