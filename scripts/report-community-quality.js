const fs = require('fs')
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\ufeff/, ''))
const before = read('docs/community-quality-before.json').sort((a, b) => b.bytes - a.bytes)
const after = read('docs/community-image-audit.json')
const size = read('docs/quality-final-package.json').size.total
const lines = ['# 社区 JPEG 二次压缩', '',
  `主包实测：1,555,319 → ${size.toLocaleString('en-US')} 字节，减少177,653字节；低于1,400,000字节目标，距1,500,000字节代码质量阈值留122,334字节。统一十进制口径。`, '',
  '社区图片含258字节占位SVG：1,017,910 → 840,257字节。19张较大JPEG质量调为64；两个较小文件保持76。直接从只读原图按原尺寸和裁剪框重建，避免对已有JPEG反复有损编码。首页保持768×432，资源卡片保持640×360。', '',
  '逐张并排查看19张前后副本，未发现明显色块、招牌文字退化或人物面部损坏，人物构图完全不变。原图哈希、裁剪框、focus与像素尺寸均已比对一致。FIFI背景和萨摩耶保持原文件不动。', '',
  '## 完整清单（按优化前大小降序）', '',
  '以下文件均位于 assets/community/。', '',
  '|文件|优化前字节|优化后字节|减少字节|', '|---|---:|---:|---:|']
for (const b of before) {
  const a = after.find((a) => a.file === b.file)
  lines.push(`|${b.file}|${b.bytes}|${a.bytes}|${b.bytes - a.bytes}|`)
}
lines.push('', '详情图片目前仍在主包，但纯编码优化已满足目标，本轮无需分包。没有改布局、路由、业务、数据库、云函数或云存储，也没有执行Git提交及网络操作。', '',
  '修改文件：19张JPEG、scripts/build-community-images.ps1、docs/community-image-audit.json；新增前后审计、编译包体记录、本报告及报告脚本；更新scripts/test-image-budget.js以校验最新实测产物和1,400,000字节目标。', '')
fs.writeFileSync('docs/COMMUNITY_JPEG_OPTIMIZATION.md', lines.join('\n'))
