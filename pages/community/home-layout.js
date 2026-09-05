const { homeFocus } = require('../../constants/community-resource-images')

function homeLayout({ windowWidth, availableHeight, headingHeight }) {
  const scale = windowWidth / 750
  // 实测区域已排除顶部导航和含安全区的底部导航；这里只扣页内留白与间距。
  const cardHeight = Math.max(200, (availableHeight / scale - headingHeight / scale - 36 - 18 - 36) / 3)
  const imageHeight = Math.max(cardHeight, (windowWidth <= 340 ? 710 : 694) * 9 / 16)
  const contentHeight = Math.max(availableHeight, headingHeight + (3 * 200 + 90) * scale)
  return { cardHeight, imageHeight, contentHeight }
}

function applyHomeLayout(page, info, availableHeight, headingHeight) {
  const { cardHeight, imageHeight, contentHeight } = homeLayout({ windowWidth: info.windowWidth, availableHeight, headingHeight })
  page.setData({
    homeScrollHeight: Math.max(1, availableHeight), homeContentHeight: contentHeight,
    entries: page.data.entries.map((entry) => ({ ...entry,
      imageStyle: `height: ${imageHeight}rpx; top: ${(cardHeight - imageHeight) * homeFocus(entry.id)}rpx;`
    }))
  })
}

function updateHomeLayout(page) {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  wx.createSelectorQuery().in(page).select('.community-scroll').boundingClientRect()
    .select('.community-heading').boundingClientRect().select('.bottom-navigation').boundingClientRect()
    .exec(([scroll, heading, navigation]) => {
      if (page.homeDisposed || !scroll || !heading || !navigation) return
      applyHomeLayout(page, info, navigation.top - scroll.top, heading.height)
    })
}

module.exports = { homeLayout, applyHomeLayout, updateHomeLayout }
