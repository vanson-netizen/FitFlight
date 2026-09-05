const fs = require('fs')
const path = require('path')
const before = JSON.parse(fs.readFileSync('docs/package-images-before.json', 'utf8'))
const audit = JSON.parse(fs.readFileSync('docs/community-image-audit.json', 'utf8').replace(/^\ufeff/, ''))
const after = before.filter((row) => fs.existsSync(row.path)).map((row) => {
  const changed = audit.find((entry) => row.path === `assets/community/${entry.file}`)
  return { ...row, width: changed ? changed.width : row.width, height: changed ? changed.height : row.height, bytes: fs.statSync(row.path).size }
}).sort((a, b) => b.bytes - a.bytes)
fs.writeFileSync('docs/package-images-after.json', JSON.stringify(after, null, 2))
const sum = (rows, test = () => true) => rows.filter(test).reduce((total, row) => total + row.bytes, 0)
const groups = {
  '成就图标（含回退 SVG）': (r) => r.path.startsWith('assets/achievements/'),
  '底部导航及我的入口图标': (r) => r.path.startsWith('assets/icons/'),
  '社区首页三图': (r) => r.path.includes('community-home-'),
  '运动资源照片': (r) => r.path.includes('community/venue-'),
  '饮食资源照片': (r) => /community\/(food|dining|merchant)-/.test(r.path),
  '全部本地图片（含 SVG 及旧二维码）': () => true
}
const lines = ['# 图片与包体优化清单', '',
  '当前无分包，表内资源属于主包。完整扫描包含隐藏目录及 PNG/JPG/JPEG/WebP/GIF/SVG 和音频；未发现本地音频、WebP、JPEG 扩展名图片或 GIF。', '',
  '## 分类汇总', '', '|分类|优化前字节|优化后字节|', '|---|---:|---:|']
for (const [group, test] of Object.entries(groups)) lines.push(`|${group}|${sum(before, test)}|${sum(after, test)}|`)
lines.push('|编译主包实测|1802949|1487766|', '',
  '主包减少 315,183 字节，恰好等于社区照片缩减 269,004 字节加删除旧二维码 46,179 字节。未调整 app.json、分包、路由和业务代码。', '',
  '图片最大从 81,959 降到 72,628 字节，无接近 200KB 的文件。成就图标保持 144×144 RGBA，5 张 PNG 合计 99,537 字节；导航图标为 81×81，我的入口图标为 96×96，均无需再次降质。', '',
  '## 优化前完整清单（降序，前 30 行为占用前 30 项）', '',
  '|路径|像素|字节|引用页面／模型|包|', '|---|---|---:|---|---|')
for (const row of before) lines.push(`|${row.path}|${row.width ? `${row.width}×${row.height}` : 'SVG 矢量'}|${row.bytes}|${row.pages.join('<br>') || '无页面引用'}|主包|`)
lines.push('', '## 优化后完整清单（降序）', '', '|路径|像素|字节|引用页面／模型|包|', '|---|---|---:|---|---|')
for (const row of after) lines.push(`|${row.path}|${row.width ? `${row.width}×${row.height}` : 'SVG 矢量'}|${row.bytes}|${row.pages.join('<br>') || '无页面引用'}|主包|`)
lines.push('', '## 清理与图片保护', '',
  '- 删除 preview/community-resource-fix-20260905.png：旧预览二维码，运行 JS/WXML/WXSS/JSON 无引用。preview 中被业务使用的 JS 保留。',
  '- 所有运行占位 SVG 均有引用，继续作为异常回退保留；未发现重复压缩副本。',
  '- C:/FitFlight/generated-achievements、generated-icons、社区图片原图未修改，也未复制进入包。照片从原图重新生成，原始 SHA-256 和裁剪框保存在 community-image-audit.json。',
  '- 18 张资源照片改为 640×360，首页三张保持 768×432；沿用原裁剪和焦点，JPEG 质量 72—76。逐张查看最终 21 张照片，未发现损坏、方向改变、颜色异常或新增割头。', '',
  '## 修改范围', '',
  '- assets/community/ 下 18 张资源 JPEG（首页三图重建结果相同）。',
  '- scripts/build-community-images.ps1：按入口／资源层级输出尺寸。',
  '- scripts/test-community-images.js：资源照片允许 640px，首页仍要求至少 750px。',
  '- scripts/test-image-budget.js、scripts/report-package-images.js 及本报告、前后清单、包体记录。',
  '- docs/community-image-audit.json 更新压缩参数和文件大小。', '')
fs.writeFileSync('docs/PACKAGE_IMAGE_INVENTORY.md', lines.join('\n'))
console.log({ before: sum(before), after: sum(after), images: after.length })
