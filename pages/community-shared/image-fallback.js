const { PLACEHOLDER_IMAGE } = require('../../constants/community-resource-images')

function imageErrorHandler(collection, idField, imageField) {
  return function (event) {
    const { id, src } = event.currentTarget.dataset
    const records = this.data[collection]
    // 分类切换后旧图片的失败事件不能影响新列表，也不清空文字内容。
    const index = records.findIndex((record) => record[idField] === id && record[imageField] === src)
    if (index < 0 || records[index].imageHidden) return
    console.warn('[community-images] load failed', { id, path: src, message: event.detail && event.detail.errMsg || 'image load error' })
    const next = records.slice()
    next[index] = { ...next[index], [imageField]: PLACEHOLDER_IMAGE, imageHidden: src === PLACEHOLDER_IMAGE }
    this.setData({ [collection]: next })
  }
}

module.exports = { imageErrorHandler }
