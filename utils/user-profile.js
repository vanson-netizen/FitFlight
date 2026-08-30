const USER_PROFILE_STORAGE_KEY = 'fitflight.userProfile'

function getUserProfile() {
  const profile = wx.getStorageSync(USER_PROFILE_STORAGE_KEY)

  if (!profile || typeof profile !== 'object') {
    return null
  }

  const nickName = typeof profile.nickName === 'string' ? profile.nickName.trim() : ''
  const avatarUrl = typeof profile.avatarUrl === 'string' ? profile.avatarUrl : ''

  if (!nickName || !avatarUrl) {
    return null
  }

  return {
    nickName,
    avatarUrl
  }
}

function saveUserProfile(profile) {
  const userProfile = {
    nickName: profile.nickName.trim(),
    avatarUrl: profile.avatarUrl
  }

  wx.setStorageSync(USER_PROFILE_STORAGE_KEY, userProfile)
  return userProfile
}

module.exports = {
  getUserProfile,
  saveUserProfile
}
