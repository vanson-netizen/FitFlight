const fs = require('fs')
const manifest = require('./community-image-manifest.json')
const entries = manifest.map(({ file, ids, home, focus, crop, note }) => ({
  src: `/assets/community/${file}`, ids, ...(home ? { home } : {}),
  // 裁剪焦点已烘焙进等比例缩略图，端上 aspectFill 不再二次裁人。
  focus, ...(crop ? { crop } : {}), ...(note ? { note } : {})
}))
const header = `// 由 scripts/build-community-image-config.js 生成；修改集中清单后重新生成。\nconst PLACEHOLDER_IMAGE = '/assets/community/placeholder.svg'\nconst IMAGE_ENTRIES = Object.freeze(${JSON.stringify(entries, null, 2)})\n`
const functions = `
const resourceImages = new Map(IMAGE_ENTRIES.flatMap((entry) => entry.ids.map((id) => [id, entry.src])))
const homeImages = new Map(IMAGE_ENTRIES.filter((entry) => entry.home).map((entry) => [entry.home, entry.src]))

function resourceImage(record) {
  if (record.cardType === 'merchant') return resourceImages.get(record.diningHallId) || PLACEHOLDER_IMAGE
  if (Array.isArray(record.sourceDiningHallIds)) {
    const covers = [...new Set(record.sourceDiningHallIds.map((id) => resourceImages.get(id)).filter(Boolean))]
    return covers.length === 1 ? covers[0] : PLACEHOLDER_IMAGE
  }
  return resourceImages.get(record.resourceId) || PLACEHOLDER_IMAGE
}

function homeImage(id) { return homeImages.get(id) || PLACEHOLDER_IMAGE }

// 首页缩短后，在保留 16:9 副本原比例的前提下移动图片裁剪窗口。
const HOME_FOCUS = Object.freeze({ sport: 0, food: 0.5, forum: 0.85 })
function homeFocus(id) { return HOME_FOCUS[id] === undefined ? 0.5 : HOME_FOCUS[id] }

module.exports = { PLACEHOLDER_IMAGE, IMAGE_ENTRIES, resourceImage, homeImage, homeFocus }
`
fs.writeFileSync('constants/community-resource-images.js', header + functions)
