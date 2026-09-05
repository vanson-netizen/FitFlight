// 用窗口和实际导航/标题位置给原生 scroll-view 明确高度，避免跨渲染器百分比高度差异。
function updateResourceLayout(page) {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
  const query = wx.createSelectorQuery().in(page)
  query.select('.resource-layout').boundingClientRect()
  query.select('.resource-list').boundingClientRect()
  query.exec(([layout, list]) => {
    if (page.resourceDisposed || !layout || !list) return
    const layoutHeight = Math.max(1, Math.floor(info.windowHeight - layout.top))
    const resourceListHeight = Math.max(1, Math.floor(info.windowHeight - list.top))
    page.setData({ layoutHeight, resourceListHeight })
  })
}

function logResourceView(page, type, category) {
  console.info('[community-resources] setData', {
    type, category, status: page.data.pageStatus, listCount: page.data.resources.length
  })
  if (!wx.createSelectorQuery) return
  wx.createSelectorQuery().in(page).select('.resource-pane').boundingClientRect()
    .select('.resource-list').boundingClientRect().exec(([pane, list]) => {
      if (page.resourceDisposed) return
      console.info('[community-resources] layout', {
        type, category, paneWidth: pane && pane.width, paneHeight: pane && pane.height,
        listWidth: list && list.width, listHeight: list && list.height
      })
    })
}

module.exports = { updateResourceLayout, logResourceView }
