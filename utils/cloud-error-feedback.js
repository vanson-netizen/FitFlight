// 仅复制诊断标识；不复制请求参数、服务端原始异常或用户资料。
function showCloudErrorFeedback(error, functionName, action) {
  if (!['SERVER_ERROR', 'NETWORK_ERROR'].includes(error.code)) return
  const safeId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : ''
  const requestId = safeId(error.requestId)
  const diagnostic = [
    `错误编号：${error.code}`,
    `requestId：${requestId || '未取得'}`,
    `函数：${functionName}`,
    `action：${action}`,
    `时间：${new Date().toISOString()}`
  ].join('\n')
  error.diagnostic = diagnostic
  if (typeof wx.showModal !== 'function') return
  wx.showModal({
    title: '操作未完成',
    content: `${error.code === 'NETWORK_ERROR' ? '网络连接失败，请检查网络后重试' : '服务暂时不可用，请稍后重试'}\n\n${diagnostic}`,
    confirmText: '复制编号',
    cancelText: '关闭',
    success(result) {
      if (result && result.confirm) wx.setClipboardData({ data: diagnostic })
    }
  })
}

module.exports = { showCloudErrorFeedback }
