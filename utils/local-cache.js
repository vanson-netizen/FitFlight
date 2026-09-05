const { isSafeCacheKey } = require('../constants/local-storage')

function listSafeCacheKeys(storageKeys = []) {
  return storageKeys.filter(isSafeCacheKey)
}

function clearSafeLocalCache() {
  const info = wx.getStorageInfoSync()
  const keys = listSafeCacheKeys(Array.isArray(info.keys) ? info.keys : [])
  const removed = []
  const failed = []
  keys.forEach((key) => {
    try {
      wx.removeStorageSync(key)
      removed.push(key)
    } catch (error) {
      failed.push(key)
    }
  })
  return { matched: keys.length, removedCount: removed.length, failedCount: failed.length }
}

module.exports = { listSafeCacheKeys, clearSafeLocalCache }
